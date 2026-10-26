import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";
import { AppError } from "@/shared/domain/app-error";
import type { Comparison, ComparisonChoice, CriterionSide } from "../types";

export function evaluationRevision(
  a: Assignment,
  userId: string,
  side: CriterionSide,
) {
  return (
    a.evaluationSubmissions?.filter(
      (s) => s.evaluatorId === userId && s.side === side,
    ).length ?? 0
  );
}

// Validate the entire request before mutating the aggregate. Re-evaluated after every optimistic-lock retry.
export function saveEvaluation(
  a: Assignment,
  user: User,
  input: Record<string, unknown>,
  submit: boolean,
) {
  if (
    user.role !== "student" ||
    a.status !== "active" ||
    new Date(a.deadline).getTime() <= Date.now() ||
    !a.groups.some((g) => g.members.some((m) => m.id === user.id))
  )
    throw new AppError("ยังไม่เปิดประเมินหรือหมดเวลาแล้ว", 403);
  if (input.expectedGeneration !== a.pairGeneration)
    throw new AppError("ชุดคู่เปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด", 409);
  const side = input.side;
  if (side !== "GROUP" && side !== "INDIVIDUAL")
    throw new AppError("ประเภทการประเมินไม่ถูกต้อง");
  const revision = evaluationRevision(a, user.id, side);
  if (input.expectedRevision !== revision)
    throw new AppError(
      "มีการส่งผลประเมินจากหน้าอื่นแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนแก้ไข",
      409,
    );
  const pairs =
    a.pairs?.filter(
      (p) => p.side === side && p.evaluator_user_id === user.id,
    ) ?? [];
  if (!pairs.length) throw new AppError("ไม่มีคู่ที่คุณมีสิทธิ์ประเมินในส่วนนี้", 403);
  if (
    input.expectedPairIds !== undefined &&
    (!Array.isArray(input.expectedPairIds) ||
      input.expectedPairIds.length !== pairs.length ||
      new Set(input.expectedPairIds).size !== pairs.length ||
      pairs.some((p) => !(input.expectedPairIds as unknown[]).includes(p.id)))
  )
    throw new AppError(
      "มีการมอบหมายคู่เพิ่ม กรุณาโหลดข้อมูลล่าสุดก่อนส่งผลประเมิน",
      409,
    );
  if (!Array.isArray(input.answers) || input.answers.length > pairs.length)
    throw new AppError("รายการคำตอบไม่ถูกต้อง");
  const ids = new Set(pairs.map((p) => p.id));
  const seen = new Set<string>();
  const now = new Date().toISOString();
  const answers: Comparison[] = input.answers.map((value: unknown) => {
    if (!value || typeof value !== "object")
      throw new AppError("รายการคำตอบไม่ถูกต้อง");
    const answer = value as Record<string, unknown>;
    const pairId = String(answer.pairId ?? "");
    if (!ids.has(pairId)) throw new AppError("ไม่พบคู่ที่คุณมีสิทธิ์ประเมิน", 403);
    if (seen.has(pairId)) throw new AppError("รายการคำตอบมีคู่ซ้ำ");
    seen.add(pairId);
    if (
      !Number.isInteger(answer.choice) ||
      Number(answer.choice) < 1 ||
      Number(answer.choice) > 6
    )
      throw new AppError("กรุณาเลือกคะแนนตั้งแต่ 1–6");
    const time = Number(answer.timeOnTaskMs ?? 0);
    if (!Number.isFinite(time) || time < 0)
      throw new AppError("เวลาประเมินไม่ถูกต้อง");
    return {
      id: `response:${pairId}`,
      pair_assignment_id: pairId,
      evaluator_user_id: user.id,
      choice: answer.choice as ComparisonChoice,
      status: submit ? "SUBMITTED" : "DRAFT",
      saved_at: now,
      ...(submit ? { submitted_at: now } : {}),
      time_on_task_ms: Math.min(86400000, time),
    };
  });
  // Drafts live outside comparisons: scores, coverage and reminders only consume submitted answers.
  if (!submit) {
    const changedIds = new Set(answers.map((c) => c.pair_assignment_id));
    a.evaluationDrafts = [
      ...(a.evaluationDrafts?.filter(
        (c) => !changedIds.has(c.pair_assignment_id),
      ) ?? []),
      ...answers,
    ];
    return;
  }
  a.comparisons = [
    ...(a.comparisons?.filter((c) => !ids.has(c.pair_assignment_id)) ?? []),
    ...answers,
  ];
  a.evaluationDrafts =
    a.evaluationDrafts?.filter((c) => !ids.has(c.pair_assignment_id)) ?? [];
  a.evaluationSubmissions ??= [];
  a.evaluationSubmissions.push({
    id: `${a.id}:${a.pairGeneration}:${user.id}:${side}:${revision + 1}`,
    evaluatorId: user.id,
    side,
    generation: a.pairGeneration!,
    revision: revision + 1,
    submittedAt: now,
    comparisons: structuredClone(answers),
  });
}
