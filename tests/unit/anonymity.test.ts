import test from "node:test";
import assert from "node:assert/strict";
import {
  checkKAnonymityThreshold,
  calculateItemScores,
  getGroupAnonymityWarning,
} from "@/features/pairwise/domain/scoring-engine";
import type { PairAssignment, Comparison, Criterion } from "@/features/pairwise/types";

test("FR-ANON-02: k-anonymity threshold masks individual score when submitted evaluators < k_min (default 3)", () => {
  const studentId = "student-nok";
  const pairs: PairAssignment[] = [
    {
      id: "pair-1",
      assignment_id: "asgn-1",
      criterion_id: "crit-1",
      side: "INDIVIDUAL",
      item_a_id: studentId,
      item_b_id: "student-ton",
      evaluator_user_id: "student-eval-1",
      display_left_item_id: studentId,
      generation: 1,
      source: "AUTO",
      created_at: new Date().toISOString(),
    },
    {
      id: "pair-2",
      assignment_id: "asgn-1",
      criterion_id: "crit-1",
      side: "INDIVIDUAL",
      item_a_id: "student-bow",
      item_b_id: studentId,
      evaluator_user_id: "student-eval-2",
      display_left_item_id: "student-bow",
      generation: 1,
      source: "AUTO",
      created_at: new Date().toISOString(),
    },
  ];

  // Case 1: 0 submitted comparisons
  const check0 = checkKAnonymityThreshold(studentId, [], pairs, 3);
  assert.equal(check0.isSatisfied, false);
  assert.equal(check0.submittedEvaluatorsCount, 0);
  assert.equal(check0.statusMessage, "ยังมีข้อมูลไม่พอ");

  // Case 2: Only 1 evaluator submitted
  const comp1: Comparison = {
    id: "comp-1",
    pair_assignment_id: "pair-1",
    evaluator_user_id: "student-eval-1",
    choice: 2,
    time_on_task_ms: 5000,
    status: "SUBMITTED",
    saved_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
  };
  const check1 = checkKAnonymityThreshold(studentId, [comp1], pairs, 3);
  assert.equal(check1.isSatisfied, false);
  assert.equal(check1.submittedEvaluatorsCount, 1);
  assert.equal(check1.statusMessage, "ยังมีข้อมูลไม่พอ");

  // Case 3: Same evaluator submitted 2 criteria -> distinct count is still 1
  const comp1Criterion2: Comparison = {
    id: "comp-1-2",
    pair_assignment_id: "pair-1",
    evaluator_user_id: "student-eval-1",
    choice: 3,
    time_on_task_ms: 4000,
    status: "SUBMITTED",
    saved_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
  };
  const checkDuplicateEvaluator = checkKAnonymityThreshold(
    studentId,
    [comp1, comp1Criterion2],
    pairs,
    3,
  );
  assert.equal(checkDuplicateEvaluator.submittedEvaluatorsCount, 1);
  assert.equal(checkDuplicateEvaluator.isSatisfied, false);

  // Case 4: 2 evaluators submitted -> still < 3
  const comp2: Comparison = {
    id: "comp-2",
    pair_assignment_id: "pair-2",
    evaluator_user_id: "student-eval-2",
    choice: 5,
    time_on_task_ms: 6000,
    status: "SUBMITTED",
    saved_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
  };
  const check2 = checkKAnonymityThreshold(studentId, [comp1, comp2], pairs, 3);
  assert.equal(check2.isSatisfied, false);
  assert.equal(check2.submittedEvaluatorsCount, 2);
  assert.equal(check2.statusMessage, "ยังมีข้อมูลไม่พอ");

  // Case 5: 3 distinct evaluators submitted -> isSatisfied = true
  const pair3: PairAssignment = {
    id: "pair-3",
    assignment_id: "asgn-1",
    criterion_id: "crit-1",
    side: "INDIVIDUAL",
    item_a_id: studentId,
    item_b_id: "student-art",
    evaluator_user_id: "student-eval-3",
    display_left_item_id: studentId,
    generation: 1,
    source: "AUTO",
    created_at: new Date().toISOString(),
  };
  const comp3: Comparison = {
    id: "comp-3",
    pair_assignment_id: "pair-3",
    evaluator_user_id: "student-eval-3",
    choice: 1,
    time_on_task_ms: 7000,
    status: "SUBMITTED",
    saved_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
  };

  const check3 = checkKAnonymityThreshold(
    studentId,
    [comp1, comp2, comp3],
    [...pairs, pair3],
    3,
  );
  assert.equal(check3.isSatisfied, true);
  assert.equal(check3.submittedEvaluatorsCount, 3);
  assert.equal(check3.statusMessage, undefined);
});

test("FR-ANON-02: calculateItemScores for INDIVIDUAL side masks displayScore if k-anonymity is not met", () => {
  const studentId = "student-nok";
  const criteria: Criterion[] = [
    {
      id: "crit-1",
      assignment_id: "asgn-1",
      name: "Contribution",
      description: "Individual contribution",
      side: "INDIVIDUAL",
      weight_pct: 100,
      display_order: 0,
    },
  ];
  const pair: PairAssignment = {
    id: "pair-1",
    assignment_id: "asgn-1",
    criterion_id: "crit-1",
    side: "INDIVIDUAL",
    item_a_id: studentId,
    item_b_id: "student-ton",
    evaluator_user_id: "eval-1",
    display_left_item_id: studentId,
    generation: 1,
    source: "AUTO",
    created_at: new Date().toISOString(),
  };
  const comp: Comparison = {
    id: "comp-1",
    pair_assignment_id: "pair-1",
    evaluator_user_id: "eval-1",
    choice: 1,
    time_on_task_ms: 5000,
    status: "SUBMITTED",
    saved_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
  };

  // 1 submission < minComparisons 3
  const result = calculateItemScores(
    studentId,
    "INDIVIDUAL",
    criteria,
    [pair],
    [comp],
    10,
    0.6,
    1.0,
    3,
  );

  assert.equal(result.kAnonymity.isSatisfied, false);
  assert.equal(result.displayScore, null);
  assert.equal(result.displayStatus, "ยังมีข้อมูลไม่พอ");
});

test("FR-ANON-04: Warns instructor about low practical anonymity when group size m = 3", () => {
  const warning3 = getGroupAnonymityWarning(3);
  assert.ok(warning3);
  assert.match(warning3, /กลุ่มขนาด 3 คน ความเป็นนิรนาม.*ต่ำมาก/);

  // Group size 4 and 5 should not have this specific m=3 warning
  assert.equal(getGroupAnonymityWarning(2), null);
  assert.equal(getGroupAnonymityWarning(4), null);
  assert.equal(getGroupAnonymityWarning(5), null);
});
