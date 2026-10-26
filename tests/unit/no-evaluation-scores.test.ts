import test from "node:test";
import assert from "node:assert/strict";
import { calculateItemScores } from "@/features/pairwise/domain/scoring-engine";
import { generatedResult } from "@/features/pairwise/domain/generated-results";
import {
  buildPairEvalWorkbook,
  type ExportData,
} from "@/features/pairwise/services/export-service";
import { worksheetToCsv } from "@/features/pairwise/services/csv-service";
import type {
  Comparison,
  Criterion,
  PairAssignment,
} from "@/features/pairwise/types";
import { makeAssignment } from "../factories";

const at = "2026-10-26T00:00:00Z";
const criterion: Criterion = {
  id: "GROUP-0",
  assignment_id: "a",
  side: "GROUP",
  name: "Quality",
  description: "",
  weight_pct: 100,
  display_order: 1,
};
const pair: PairAssignment = {
  id: "p",
  assignment_id: "a",
  side: "GROUP",
  criterion_id: criterion.id,
  item_a_id: "g1",
  item_b_id: "g2",
  evaluator_user_id: "s3",
  display_left_item_id: "g1",
  generation: 1,
  source: "AUTO",
  created_at: at,
};
const response: Comparison = {
  id: "r",
  pair_assignment_id: pair.id,
  evaluator_user_id: "s3",
  choice: 1,
  status: "SUBMITTED",
  saved_at: at,
  submitted_at: at,
};
const score = (
  responses: Comparison[],
  criteria = [criterion],
  pairs = [pair],
  roles = {},
  weight = 1,
) =>
  calculateItemScores(
    "g1",
    "GROUP",
    criteria,
    pairs,
    responses,
    15,
    0.6,
    1,
    3,
    roles,
    weight,
  );

test("no submitted evidence produces null quality and scores, zero count and LOW_CONFIDENCE", () => {
  const result = score([]);
  assert.equal(result.totalScore, null);
  assert.equal(result.displayScore, null);
  assert.equal(result.displayStatus, "ยังไม่มีผลประเมิน");
  assert.equal(result.hasData, false);
  assert.deepEqual(result.criterionScores[0], {
    criterionId: "GROUP-0",
    criterionName: "Quality",
    weightPct: 100,
    q: null,
    comparisonCount: 0,
    scoreRatio: null,
    weightedScore: null,
    flags: ["LOW_CONFIDENCE"],
  });
  assert.equal(
    score([], []).totalScore,
    null,
    "new assignments without criteria must not show a score",
  );
  assert.equal(
    calculateItemScores("g1", "GROUP", [], [], [], 0).totalScore,
    0,
    "disabled components remain zero",
  );
});

test("draft, excluded, dangling and unrelated responses cannot create an initial score", () => {
  const result = score([
    { ...response, status: "DRAFT" },
    { ...response, status: "EXCLUDED" },
    { ...response, pair_assignment_id: "old-pair" },
  ]);
  assert.equal(result.totalScore, null);
  assert.equal(result.criterionScores[0].comparisonCount, 0);
  assert.equal(
    score([response], [criterion], [{ ...pair, item_a_id: "other" }])
      .totalScore,
    null,
  );
  assert.equal(
    score([response], [criterion], [pair], { s3: "OWNER" }, 0).totalScore,
    null,
    "zero effective weight must not imply q=0.5",
  );
});

test("partial criteria expose actual results and wait for missing criteria without imputing a baseline", () => {
  const criteria = [
    { ...criterion, weight_pct: 50 },
    { ...criterion, id: "GROUP-1", weight_pct: 50 },
  ];
  const pairs = [pair, { ...pair, id: "p2", criterion_id: "GROUP-1" }];
  const partial = score([response], criteria, pairs);
  assert.equal(partial.totalScore, null);
  assert.equal(partial.displayStatus, "ยังมีข้อมูลไม่พอ");
  assert.equal(partial.criterionScores[0].weightedScore, 7.5);
  assert.equal(partial.criterionScores[1].q, null);
  const complete = score(
    [response, { ...response, id: "r2", pair_assignment_id: "p2", choice: 6 }],
    criteria,
    pairs,
  );
  assert.equal(complete.totalScore, 12);
  assert.ok(
    complete.criterionScores.every((item) =>
      item.flags.includes("LOW_CONFIDENCE"),
    ),
  );
  assert.equal(
    score([{ ...response, choice: 6 }]).totalScore,
    9,
    "a real q=0 still receives the configured band floor",
  );
  assert.equal(
    calculateItemScores(
      "g1",
      "GROUP",
      [criterion],
      [pair],
      [{ ...response, choice: 6 }],
      15,
      0,
      1,
    ).totalScore,
    0,
    "a real zero must not be masked as missing",
  );
});

test("generated student/API results stay empty before any evaluation, while explicit and frozen scores remain valid", () => {
  const assignment = makeAssignment({
    id: "a",
    pairwiseRequired: true,
    questions: ["Quality"],
    groups: [
      { id: "g1", name: "One", members: [{ id: "s1", name: "Student" }] },
    ],
    students: [{ id: "s1", name: "Student" }],
    individualMaxScore: 0,
    pairs: [pair],
    comparisons: [],
  });
  assert.equal(generatedResult(assignment, "s1").groupScore, null);
  assert.equal(generatedResult(assignment, "s1").finalScore, null);
  assignment.comparisons = [response];
  assert.equal(generatedResult(assignment, "s1").groupScore, 15);
  assignment.comparisons = [];
  assignment.scoreOverrides = [
    {
      targetId: "s1",
      targetType: "student",
      overriddenScore: 0,
      reason: "Verified override",
      overriddenBy: assignment.ownerId,
      overriddenAt: at,
    },
  ];
  assert.equal(generatedResult(assignment, "s1").finalScore, 0);
  assignment.status = "finalized";
  assignment.finalizedSnapshot = {
    finalizedAt: at,
    finalizedBy: assignment.ownerId,
    inputs: {
      groups: assignment.groups,
      questions: assignment.questions,
      votes: [],
    },
    outputs: {
      scores: { s1: { groupScore: 12, individualScore: 0, finalScore: 12 } },
    },
  };
  assert.equal(generatedResult(assignment, "s1").groupScore, 12);
});

test("generated XLSX and CSV leave missing scores blank and retain zero overrides", async () => {
  const data: ExportData = {
    generation: 1,
    classroom: {
      id: "c",
      name: "Class",
      slug: "class",
      timezone: "Asia/Bangkok",
      allowed_email_domains: [],
      status: "ACTIVE",
      created_by: "t",
      created_at: at,
    },
    assignment: {
      id: "a",
      classroom_id: "c",
      name: "Assignment",
      slug: "assignment",
      description: "",
      group_max_score: 15,
      individual_max_score: 5,
      group_deadline_utc: at,
      individual_deadline_utc: at,
      instructor_weight: 1,
      target_coverage: 3,
      max_workload: 8,
      min_comparisons: 3,
      score_floor: 0.6,
      score_ceiling: 1,
      completion_threshold: 0.9,
      scoring_formula_version: "v2.0",
      pairing_seed: 1,
      status: "OPEN",
      criteria: [
        criterion,
        { ...criterion, id: "INDIVIDUAL-0", side: "INDIVIDUAL" },
      ],
      created_by: "t",
      created_at: at,
    },
    groups: [
      { id: "g1", classroom_id: "c", name: "Group One", created_at: at },
    ],
    members: ["s1", "s2", "s3"].map((id) => ({
      id,
      user_id: id,
      classroom_id: "c",
      role: "STUDENT",
      group_id: "g1",
      email: `${id}@example.invalid`,
      display_name: id,
      joined_at: at,
    })),
    pairs: [pair],
    comparisons: [],
  };
  const workbook = await buildPairEvalWorkbook(data);
  const group = workbook.getWorksheet("Group Summary")!;
  const individual = workbook.getWorksheet("Individual Summary")!;
  assert.equal(workbook.worksheets.length, 4);
  for (const column of [4, 6, 7])
    assert.equal(group.getRow(2).getCell(column).value, null);
  assert.equal(group.getRow(2).getCell(5).value, 0);
  assert.equal(group.getRow(2).getCell(8).value, "LOW_CONFIDENCE");
  for (const column of [6, 8, 11])
    assert.equal(individual.getRow(2).getCell(column).value, null);
  const csv = worksheetToCsv(group);
  assert.ok(!csv.includes('"0.5"'));
  assert.ok(csv.includes('"LOW_CONFIDENCE"'));
  data.finalScoreOverrides = { s1: 0 };
  const overridden = await buildPairEvalWorkbook(data);
  assert.equal(
    overridden.getWorksheet("Individual Summary")!.getRow(2).getCell(11).value,
    0,
  );
});
