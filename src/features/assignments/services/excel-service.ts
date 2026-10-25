import type { Assignment } from "../types";
import { generatedCriteria } from "@/features/pairwise/domain/regeneration";
import {
  CSV_REPORTS,
  worksheetToCsv,
  type CsvReport,
} from "@/features/pairwise/services/csv-service";
import {
  buildPairEvalWorkbook,
  formatExportFilename,
  type ExportData,
} from "@/features/pairwise/services/export-service";
import type {
  Classroom,
  ClassroomMember,
  Comparison,
  GroupEntity,
  PairAssignment,
  Assignment as PairwiseAssignment,
} from "@/features/pairwise/types";

export async function readQuestionsFromExcel(file: File): Promise<string[]> {
  if (file.size > 5 * 1024 * 1024) throw Error("ไฟล์ต้องไม่เกิน 5 MB");
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheet = wb.worksheets[0];
  if (!sheet) throw Error("ไม่พบแผ่นงาน");
  const questions: string[] = [];
  sheet.eachRow((row) => {
    const text = row.getCell(1).text.trim();
    if (
      text &&
      !(
        row.number === 1 &&
        ["คำถาม", "question", "questions"].includes(text.toLowerCase())
      )
    )
      questions.push(text);
  });
  if (
    !questions.length ||
    questions.length > 100 ||
    questions.some((q) => q.length > 1000)
  )
    throw Error("ไฟล์ต้องมีคำถาม 1–100 ข้อในคอลัมน์แรก");
  return questions;
}

export async function exportAnswersToExcel(a: Assignment) {
  return downloadAnswers(a);
}

export async function exportAnswersToCsv(a: Assignment, report: CsvReport) {
  return downloadAnswers(a, report);
}

async function downloadAnswers(a: Assignment, report?: CsvReport) {
  const classroomSlug = "classroom";
  const assignmentSlug =
    a.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "assignment";

  const classroom: Classroom = {
    id: "classroom-1",
    name: "ห้องเรียนหลักสูตร",
    slug: classroomSlug,
    timezone: "Asia/Bangkok",
    allowed_email_domains: [],
    status: "ACTIVE",
    created_by: a.ownerId,
    created_at: a.createdAt,
  };

  const criteria = a.pairs
    ? generatedCriteria(a)
    : a.questions.map((q, idx) => ({
        id: `crit-${idx}`,
        assignment_id: a.id,
        side: "GROUP" as const,
        name: q,
        description: q,
        weight_pct: Number((100 / (a.questions.length || 1)).toFixed(2)),
        display_order: idx + 1,
      }));

  const pairwiseAssignment: PairwiseAssignment = {
    id: a.id,
    classroom_id: classroom.id,
    name: a.title,
    slug: assignmentSlug,
    description: a.description,
    group_max_score: a.groupMaxScore ?? 15,
    individual_max_score: a.individualMaxScore ?? 5,
    group_deadline_utc: a.deadline,
    individual_deadline_utc: a.deadline,
    instructor_weight: a.instructorWeight ?? 1.0,
    target_coverage: a.targetCoverage ?? 5,
    max_workload: a.maxWorkload ?? 8,
    min_comparisons: a.minComparisons ?? 3,
    score_floor: a.scoreFloor ?? 0.6,
    score_ceiling: a.scoreCeiling ?? 1.0,
    completion_threshold: a.completionThreshold ?? 0.9,
    scoring_formula_version: "v2.0",
    pairing_seed: 42,
    status:
      a.status === "active"
        ? "OPEN"
        : a.status === "closed"
          ? "CLOSED"
          : "DRAFT",
    criteria,
    created_by: a.ownerId,
    created_at: a.createdAt,
  };

  const groups: GroupEntity[] = a.groups.map((g) => ({
    id: g.id,
    classroom_id: classroom.id,
    name: g.name,
    created_at: a.createdAt,
  }));

  const members: ClassroomMember[] = a.students.map((s) => {
    const group = a.groups.find((g) => g.members.some((m) => m.id === s.id));
    return {
      id: s.id,
      classroom_id: classroom.id,
      user_id: s.id,
      role: "STUDENT" as const,
      group_id: group ? group.id : null,
      email: `${s.id}@example.com`,
      display_name: s.name,
      joined_at: a.createdAt,
    };
  });

  const pairs: PairAssignment[] = [...(a.pairs ?? [])];
  const comparisons: Comparison[] = [...(a.comparisons ?? [])];

  // Map votes into pairs and comparisons
  (a.pairs ? [] : a.votes).forEach((v, vIdx) => {
    criteria.forEach((crit, cIdx) => {
      const pairId = `pair-${vIdx}-${crit.id}`;
      const targetId = v.groupId || v.studentId || "";
      const otherGroup = groups.find((g) => g.id !== targetId);
      const pair: PairAssignment = {
        id: pairId,
        assignment_id: a.id,
        criterion_id: crit.id,
        side: "GROUP",
        item_a_id: targetId,
        item_b_id: otherGroup ? otherGroup.id : targetId,
        evaluator_user_id: v.userId,
        display_left_item_id: targetId,
        generation: 1,
        source: "AUTO",
        created_at: v.createdAt,
      };
      pairs.push(pair);

      const rawScore = v.scores[cIdx] ?? 3;
      const choice = Math.min(6, Math.max(1, rawScore)) as Comparison["choice"];
      comparisons.push({
        id: `comp-${pairId}`,
        pair_assignment_id: pairId,
        evaluator_user_id: v.userId,
        choice,
        status: "SUBMITTED",
        time_on_task_ms: 5000,
        saved_at: v.createdAt,
        submitted_at: v.createdAt,
      });
    });
  });

  const exportData: ExportData = {
    generation: a.pairGeneration,
    classroom,
    assignment: pairwiseAssignment,
    groups,
    members,
    pairs,
    comparisons,
  };

  const wb = await buildPairEvalWorkbook(exportData);
  const sheet = report ? wb.getWorksheet(CSV_REPORTS[report]) : undefined;
  if (report && !sheet) throw Error("ไม่พบรายงานที่ต้องการส่งออก");
  const buffer = sheet ? worksheetToCsv(sheet) : await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: report
        ? "text/csv;charset=utf-8"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = formatExportFilename(
    classroomSlug,
    assignmentSlug,
    report ?? "results",
    new Date(),
    report ? "csv" : "xlsx",
  );
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
