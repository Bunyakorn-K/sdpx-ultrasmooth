import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPairEvalWorkbook,
  formatExportFilename,
} from "@/features/pairwise/services/export-service";
import type { ExportData } from "@/features/pairwise/services/export-service";

test("FR-EXPORT-05: filename format matches {classroom_slug}_{assignment_slug}_{report}_{YYYYMMDD-HHmm}.xlsx", () => {
  const date = new Date("2026-08-03T07:30:00.000Z");
  const filename = formatExportFilename("cs101", "project1", "summary", date);
  assert.equal(filename, "cs101_project1_summary_20260803-0730.xlsx");
});

test("FR-EXPORT-02 & FR-EXPORT-06: XLSX workbook contains exactly 4 sheets with metadata and calculations", async () => {
  const mockData: ExportData = {
    classroom: {
      id: "class-1",
      name: "Software Engineering 2026",
      slug: "se2026",
      timezone: "Asia/Bangkok",
      allowed_email_domains: ["uni.ac.th"],
      status: "ACTIVE",
      created_by: "inst-1",
      created_at: new Date().toISOString(),
    },
    assignment: {
      id: "assign-1",
      classroom_id: "class-1",
      name: "Pair Project",
      slug: "pair-project",
      description: "Evaluate peer projects",
      group_max_score: 15,
      individual_max_score: 5,
      group_deadline_utc: "2026-08-10T17:00:00Z",
      individual_deadline_utc: "2026-08-10T17:00:00Z",
      instructor_weight: 1.0,
      target_coverage: 5,
      max_workload: 8,
      min_comparisons: 3,
      score_floor: 0.6,
      score_ceiling: 1.0,
      completion_threshold: 0.9,
      scoring_formula_version: "v2.0",
      pairing_seed: 42,
      status: "FINALIZED",
      criteria: [
        {
          id: "c-ux",
          assignment_id: "assign-1",
          side: "GROUP",
          name: "User Experience",
          description: "",
          weight_pct: 100,
          display_order: 1,
        },
        {
          id: "c-team",
          assignment_id: "assign-1",
          side: "INDIVIDUAL",
          name: "Teamwork",
          description: "",
          weight_pct: 100,
          display_order: 1,
        },
      ],
      created_by: "inst-1",
      created_at: new Date().toISOString(),
    },
    groups: [
      { id: "g-1", classroom_id: "class-1", name: "Aurora", created_at: new Date().toISOString() },
      { id: "g-2", classroom_id: "class-1", name: "Borealis", created_at: new Date().toISOString() },
    ],
    members: [
      {
        id: "m-1",
        classroom_id: "class-1",
        user_id: "u-1",
        role: "STUDENT",
        group_id: "g-1",
        email: "nok@uni.ac.th",
        display_name: "Nok",
        student_id: "66010001",
        joined_at: new Date().toISOString(),
      },
      {
        id: "m-2",
        classroom_id: "class-1",
        user_id: "u-2",
        role: "STUDENT",
        group_id: "g-2",
        email: "win@uni.ac.th",
        display_name: "Win",
        student_id: "66010002",
        joined_at: new Date().toISOString(),
      },
    ],
    pairs: [
      {
        id: "pair-1",
        assignment_id: "assign-1",
        criterion_id: "c-ux",
        side: "GROUP",
        item_a_id: "g-1",
        item_b_id: "g-2",
        evaluator_user_id: "u-1",
        display_left_item_id: "g-1",
        generation: 1,
        source: "AUTO",
        created_at: new Date().toISOString(),
      },
    ],
    comparisons: [
      {
        id: "comp-1",
        pair_assignment_id: "pair-1",
        evaluator_user_id: "u-1",
        choice: 1, // Aurora gets 1.0
        status: "SUBMITTED",
        saved_at: new Date().toISOString(),
      },
    ],
  };

  const wb = await buildPairEvalWorkbook(mockData);

  // FR-EXPORT-02: Exactly 4 sheets
  assert.deepEqual(
    wb.worksheets.map((s) => s.name),
    ["Group Summary", "Individual Summary", "Pair Coverage", "Metadata"],
  );

  // Metadata sheet includes formula version
  const metaSheet = wb.getWorksheet("Metadata");
  assert.ok(metaSheet);
  const rows = metaSheet.getRows(1, metaSheet.rowCount);
  const formulaRow = rows?.find((r) => r.getCell(1).value === "Scoring Formula Version");
  assert.ok(formulaRow);
  assert.equal(formulaRow.getCell(2).value, "v2.0");

  // Pair coverage sheet
  const pairSheet = wb.getWorksheet("Pair Coverage");
  assert.ok(pairSheet);
  assert.equal(pairSheet.getRow(1).getCell(1).value, "Pair ID");
  assert.equal(pairSheet.getRow(2).getCell(4).value, "Aurora");
  assert.equal(pairSheet.getRow(2).getCell(5).value, "Borealis");
  assert.equal(pairSheet.getRow(2).getCell(7).value, 1); // actual coverage = 1
});
