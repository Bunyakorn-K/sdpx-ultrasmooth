import type {
  Assignment,
  Classroom,
  ClassroomMember,
  Comparison,
  GroupEntity,
  PairAssignment,
} from "../types";
import {
  calculateItemScores,
  calculateParticipation,
  calculateParticipationMultiplier,
} from "../domain/scoring-engine";

export type ExportData = {
  finalScoreOverrides?: Record<string, number>;
  generation?: number;
  classroom: Classroom;
  assignment: Assignment;
  groups: GroupEntity[];
  members: ClassroomMember[];
  pairs: PairAssignment[];
  comparisons: Comparison[];
};

export async function buildPairEvalWorkbook(data: ExportData) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const { classroom, assignment, groups, members, pairs, comparisons } = data;

  const evaluatorRoles = assignment.created_by
    ? { [assignment.created_by]: "OWNER" as const }
    : {};
  const instructorWeight = assignment.instructor_weight ?? 1.0;
  // Historical finalized exports without a persisted pairing generation retain
  // their original calculation contract. Current/generated reports never impute scores.
  const preserveLegacyBaseline =
    data.generation === undefined && assignment.status === "FINALIZED";

  // 1. Sheet 1: Group Summary
  const groupSheet = wb.addWorksheet("Group Summary");
  groupSheet.addRow([
    "Group Name",
    "Criterion",
    "Weight (%)",
    "Quality Index (q)",
    "Comparison Count",
    "Score Ratio",
    "Weighted Score",
    "Flags",
  ]);

  for (const group of groups) {
    const scores = calculateItemScores(
      group.id,
      "GROUP",
      assignment.criteria,
      pairs,
      comparisons,
      assignment.group_max_score,
      assignment.score_floor,
      assignment.score_ceiling,
      assignment.min_comparisons,
      evaluatorRoles,
      instructorWeight,
      preserveLegacyBaseline,
    );
    for (const c of scores.criterionScores) {
      groupSheet.addRow([
        group.name,
        c.criterionName,
        c.weightPct,
        c.q,
        c.comparisonCount,
        c.scoreRatio,
        c.weightedScore,
        c.flags.join(", "),
      ]);
    }
  }

  // 2. Sheet 2: Individual Summary
  const indivSheet = wb.addWorksheet("Individual Summary");
  indivSheet.addRow([
    "Student Name",
    "Student ID",
    "Group Name",
    "Criterion",
    "Weight (%)",
    "Quality Index (q)",
    "Comparison Count",
    "Weighted Score",
    "Participation (p)",
    "Multiplier (M)",
    "Personal Final Score",
    "Flags",
  ]);

  const students = members.filter((m) => m.role === "STUDENT");
  for (const student of students) {
    const studentGroup = groups.find((g) => g.id === student.group_id);
    const assignedPairs = pairs.filter(
      (p) => p.evaluator_user_id === student.user_id,
    );
    const submittedCount = comparisons.filter(
      (c) =>
        c.evaluator_user_id === student.user_id && c.status === "SUBMITTED",
    ).length;

    const p = calculateParticipation(submittedCount, assignedPairs.length);
    const M = calculateParticipationMultiplier(
      p,
      assignment.completion_threshold,
    );

    // Group component score for this student's group
    const groupScores = studentGroup
      ? calculateItemScores(
          studentGroup.id,
          "GROUP",
          assignment.criteria,
          pairs,
          comparisons,
          assignment.group_max_score,
          assignment.score_floor,
          assignment.score_ceiling,
          assignment.min_comparisons,
          evaluatorRoles,
          instructorWeight,
          preserveLegacyBaseline,
        ).totalScore
      : 0;

    const indivScores = calculateItemScores(
      student.user_id,
      "INDIVIDUAL",
      assignment.criteria,
      pairs,
      comparisons,
      !preserveLegacyBaseline &&
        members.filter(
          (member) =>
            member.role === "STUDENT" && member.group_id === student.group_id,
        ).length <= 2
        ? 0
        : assignment.individual_max_score,
      assignment.score_floor,
      assignment.score_ceiling,
      assignment.min_comparisons,
      evaluatorRoles,
      instructorWeight,
      preserveLegacyBaseline,
    );

    const personalFinal =
      data.finalScoreOverrides?.[student.user_id] ??
      (groupScores === null || indivScores.totalScore === null
        ? null
        : Number(((groupScores + indivScores.totalScore) * M).toFixed(2)));

    for (const c of indivScores.criterionScores) {
      indivSheet.addRow([
        student.display_name,
        student.student_id || "-",
        studentGroup?.name || "-",
        c.criterionName,
        c.weightPct,
        c.q,
        c.comparisonCount,
        c.weightedScore,
        p,
        M,
        personalFinal,
        c.flags.join(", "),
      ]);
    }
  }

  // 3. Sheet 3: Pair Coverage
  const pairSheet = wb.addWorksheet("Pair Coverage");
  pairSheet.addRow([
    "Pair ID",
    "Side",
    "Criterion",
    "Item A",
    "Item B",
    "Target Coverage (R)",
    "Actual Coverage",
    "Status",
  ]);

  const pairCoverageMap = new Map<string, number>();
  for (const comp of comparisons) {
    if (comp.status === "SUBMITTED") {
      pairCoverageMap.set(
        comp.pair_assignment_id,
        (pairCoverageMap.get(comp.pair_assignment_id) || 0) + 1,
      );
    }
  }

  const exportPairs =
    data.generation === undefined
      ? pairs
      : [
          ...new Map(
            pairs.map((p) => [
              JSON.stringify([
                p.criterion_id,
                ...[p.item_a_id, p.item_b_id].sort(),
              ]),
              p,
            ]),
          ).values(),
        ];
  for (const p of exportPairs) {
    const criterion = assignment.criteria.find((c) => c.id === p.criterion_id);
    const relevant =
      data.generation === undefined
        ? [p]
        : pairs.filter(
            (other) =>
              other.criterion_id === p.criterion_id &&
              [other.item_a_id, other.item_b_id].sort().join(":") ===
                [p.item_a_id, p.item_b_id].sort().join(":"),
          );
    const actualCoverage = relevant.reduce(
      (sum, pair) => sum + (pairCoverageMap.get(pair.id) ?? 0),
      0,
    );
    const itemAName =
      groups.find((g) => g.id === p.item_a_id)?.name ||
      members.find((m) => m.user_id === p.item_a_id)?.display_name ||
      p.item_a_id;
    const itemBName =
      groups.find((g) => g.id === p.item_b_id)?.name ||
      members.find((m) => m.user_id === p.item_b_id)?.display_name ||
      p.item_b_id;

    pairSheet.addRow([
      p.id,
      p.side,
      criterion?.name || p.criterion_id,
      itemAName,
      itemBName,
      assignment.target_coverage,
      actualCoverage,
      actualCoverage >= assignment.min_comparisons
        ? "SUFFICIENT"
        : "LOW_COVERAGE",
    ]);
  }

  // 4. Sheet 4: Metadata (FR-EXPORT-02, FR-EXPORT-06)
  const metaSheet = wb.addWorksheet("Metadata");
  metaSheet.addRow(["Property", "Value"]);
  if (data.generation !== undefined)
    metaSheet.addRow(["Pair Generation", data.generation]);
  metaSheet.addRow(["Classroom", classroom.name]);
  metaSheet.addRow(["Classroom Slug", classroom.slug]);
  metaSheet.addRow(["Assignment", assignment.name]);
  metaSheet.addRow(["Assignment Slug", assignment.slug]);
  metaSheet.addRow([
    "Scoring Formula Version",
    assignment.scoring_formula_version,
  ]);
  metaSheet.addRow(["Group Max Score", assignment.group_max_score]);
  metaSheet.addRow(["Individual Max Score", assignment.individual_max_score]);
  metaSheet.addRow(["Score Floor", assignment.score_floor]);
  metaSheet.addRow(["Score Ceiling", assignment.score_ceiling]);
  metaSheet.addRow(["Completion Threshold", assignment.completion_threshold]);
  metaSheet.addRow(["Instructor Weight", assignment.instructor_weight]);
  metaSheet.addRow(["Exported At (UTC)", new Date().toISOString()]);

  // Styling for all sheets: teal header with white bold text
  [groupSheet, indivSheet, pairSheet, metaSheet].forEach((sheet) => {
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF36AD94" },
    };
    sheet.columns.forEach((col) => {
      col.width = 24;
    });
  });

  return wb;
}

export function formatExportFilename(
  classroomSlug: string,
  assignmentSlug: string,
  report: string = "results",
  now: Date = new Date(),
  extension: "xlsx" | "csv" = "xlsx",
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = now.getUTCFullYear();
  const mm = pad(now.getUTCMonth() + 1);
  const dd = pad(now.getUTCDate());
  const hh = pad(now.getUTCHours());
  const min = pad(now.getUTCMinutes());
  return `${classroomSlug}_${assignmentSlug}_${report}_${yyyy}${mm}${dd}-${hh}${min}.${extension}`;
}
