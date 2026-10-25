import { randomUUID } from "node:crypto";
import type { User } from "@/features/auth/types";
import type { AuditService } from "@/features/audit/server/audit-service";
import type { ClassroomRepository } from "@/features/classroom/server/classroom-repository";
import { AppError } from "@/shared/domain/app-error";
import { encodeCsv } from "@/features/pairwise/services/csv-service";
import { formatExportFilename } from "@/features/pairwise/services/export-service";
import type { AssignmentRepository } from "./assignment-repository";
import type { ExportIdentityRepository } from "../data/export-identity-repository";

export class RawExportService {
  constructor(
    private readonly assignments: AssignmentRepository,
    private readonly identities: ExportIdentityRepository,
    private readonly audit: Pick<AuditService, "record">,
    private readonly classrooms?: ClassroomRepository,
  ) {}

  async export(user: User, id: string, input: Record<string, unknown>) {
    const record = await this.assignments.findById(id);
    if (!record) throw new AppError("ไม่พบ assignment", 404);
    const a = record.assignment;
    if (user.role !== "teacher" || a.ownerId !== user.id)
      throw new AppError("เฉพาะ Owner ของ Assignment เท่านั้นที่ส่งออกข้อมูลดิบได้", 403);
    const classroom = a.classroomId
      ? (await this.classrooms?.findById(a.classroomId))?.classroom
      : undefined;
    if (a.classroomId && (!classroom || classroom.created_by !== user.id))
      throw new AppError("คุณไม่มีสิทธิ์ส่งออกข้อมูลของห้องเรียนนี้", 403);
    const mode = input.identityMode ?? "pseudonymous";
    if (mode !== "pseudonymous" && mode !== "identified")
      throw new AppError("รูปแบบตัวตนไม่ถูกต้อง");
    const identified = mode === "identified";
    if (identified && input.confirmIdentity !== true)
      throw new AppError("กรุณายืนยันเจตนาส่งออกตัวตนผู้ประเมิน", 400);
    const source =
      a.status === "finalized" && a.finalizedSnapshot?.inputs.pairs
        ? a.finalizedSnapshot.inputs
        : a;
    if (!source.pairs) throw new AppError("งานนี้ยังไม่มีข้อมูลประเมินแบบคู่", 409);
    const pairs = new Map(source.pairs.map((p) => [p.id, p]));
    // Only committed comparisons from the current/finalized set; never drafts or archived generations.
    const comparisons = (source.comparisons ?? []).filter(
      (c) =>
        c.status !== "DRAFT" &&
        pairs.get(c.pair_assignment_id)?.evaluator_user_id ===
          c.evaluator_user_id,
    );
    const evaluatorIds = [
      ...new Set(comparisons.map((c) => c.evaluator_user_id)),
    ];
    const identities = new Map(
      (identified ? await this.identities.findByIds(evaluatorIds) : []).map(
        (i) => [i.id, i],
      ),
    );
    const pseudonyms = new Map<string, string>();
    const pseudonym = (value: string) => {
      if (!pseudonyms.has(value)) pseudonyms.set(value, `anon-${randomUUID()}`);
      return pseudonyms.get(value)!;
    };
    const rows: (string | number)[][] = [
      [
        "Comparison",
        "Evaluator ID",
        ...(identified ? ["Evaluator Name", "Evaluator Email"] : []),
        "Side",
        "Criterion",
        "Item A",
        "Item B",
        "Display Left",
        "Choice",
        "Status",
        "Time on Task (ms)",
        "Submitted At",
        "Generation",
        "Source",
        "Formula Version",
      ],
    ];
    comparisons.forEach((c, index) => {
      const p = pairs.get(c.pair_assignment_id)!;
      const identity = identities.get(c.evaluator_user_id);
      const item = (value: string) => (identified ? value : pseudonym(value));
      rows.push([
        `comparison-${index + 1}`,
        identified ? c.evaluator_user_id : pseudonym(c.evaluator_user_id),
        ...(identified ? [identity?.name ?? "", identity?.email ?? ""] : []),
        p.side,
        p.criterion_id,
        item(p.item_a_id),
        item(p.item_b_id),
        item(p.display_left_item_id),
        c.choice,
        c.status,
        c.time_on_task_ms ?? "",
        c.submitted_at ?? "",
        p.generation,
        p.source,
        "v2.0",
      ]);
    });
    const csv = encodeCsv(rows);
    if (identified) {
      // Fail closed: no file is returned until the audit is durably saved.
      await this.audit.record({
        actor_id: user.id,
        action: "EXPORT_IDENTITY",
        resource_type: "assignment",
        resource_id: a.id,
        assignment_id: a.id,
        classroom_id: a.classroomId ?? null,
        reason: "Owner explicitly confirmed evaluator identity export",
        after_state: {
          report: "raw-comparisons",
          identityMode: mode,
          rowCount: comparisons.length,
          generation: a.pairGeneration ?? 0,
          assignmentVersion: record.version,
        },
      });
    }
    return {
      csv,
      filename: formatExportFilename(
        classroom?.slug ?? "classroom",
        a.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "assignment",
        identified ? "raw-comparisons-identified" : "raw-comparisons",
        new Date(),
        "csv",
      ),
    };
  }
}
