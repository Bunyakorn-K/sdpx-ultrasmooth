import test from "node:test";
import assert from "node:assert/strict";
import {
  checkLowCoverage,
  checkStraightLining,
  checkPositionBias,
  checkIntransitivity,
  checkSpeedRun,
  analyzeAssignmentSignals,
} from "@/features/pairwise/domain/quality-signals";
import type { Comparison, PairAssignment } from "@/features/pairwise/types";

function makeComp(partial: Partial<Comparison> & { id: string; pair_assignment_id: string; evaluator_user_id: string; choice: Comparison["choice"] }): Comparison {
  return {
    status: "SUBMITTED",
    saved_at: new Date().toISOString(),
    ...partial,
  };
}

test("QS-01: flags items with fewer comparisons than threshold", () => {
  const signal = checkLowCoverage("item-1", "crit-1", 2, 3);
  assert.ok(signal);
  assert.equal(signal?.code, "QS-01");
  assert.equal(signal?.metric, 2);

  const good = checkLowCoverage("item-1", "crit-1", 3, 3);
  assert.equal(good, null);
});

test("QS-02: flags evaluators with >80% straight-lining", () => {
  const comparisons: Comparison[] = [
    makeComp({ id: "1", pair_assignment_id: "p1", evaluator_user_id: "user-1", choice: 2 }),
    makeComp({ id: "2", pair_assignment_id: "p2", evaluator_user_id: "user-1", choice: 2 }),
    makeComp({ id: "3", pair_assignment_id: "p3", evaluator_user_id: "user-1", choice: 2 }),
    makeComp({ id: "4", pair_assignment_id: "p4", evaluator_user_id: "user-1", choice: 2 }),
    makeComp({ id: "5", pair_assignment_id: "p5", evaluator_user_id: "user-1", choice: 1 }),
  ];

  // 4 out of 5 = 80%, not strictly > 80%
  const noSignal = checkStraightLining("user-1", comparisons, 0.8);
  assert.equal(noSignal, null);

  // 5 out of 5 = 100% > 80%
  comparisons[4].choice = 2;
  const signal = checkStraightLining("user-1", comparisons, 0.8);
  assert.ok(signal);
  assert.equal(signal?.code, "QS-02");
  assert.equal(signal?.metric, 1.0);
});

test("QS-03: flags evaluators with >80% position bias", () => {
  // Choices 1, 2, 3 are Left. Choices 4, 5, 6 are Right.
  const comparisons: Comparison[] = [
    makeComp({ id: "1", pair_assignment_id: "p1", evaluator_user_id: "user-1", choice: 1 }),
    makeComp({ id: "2", pair_assignment_id: "p2", evaluator_user_id: "user-1", choice: 2 }),
    makeComp({ id: "3", pair_assignment_id: "p3", evaluator_user_id: "user-1", choice: 3 }),
    makeComp({ id: "4", pair_assignment_id: "p4", evaluator_user_id: "user-1", choice: 1 }),
    makeComp({ id: "5", pair_assignment_id: "p5", evaluator_user_id: "user-1", choice: 2 }),
  ];
  // 5 out of 5 are left
  const signal = checkPositionBias("user-1", comparisons, 0.8);
  assert.ok(signal);
  assert.equal(signal?.code, "QS-03");
  assert.equal(signal?.metric, 1.0);
});

test("QS-04: flags intransitivity when cyclic choices exceed threshold", () => {
  const pairs: PairAssignment[] = [
    {
      id: "p1",
      assignment_id: "a1",
      criterion_id: "c1",
      side: "GROUP",
      item_a_id: "A",
      item_b_id: "B",
      evaluator_user_id: "user-1",
      display_left_item_id: "A",
      generation: 1,
      source: "AUTO",
      created_at: new Date().toISOString(),
    },
    {
      id: "p2",
      assignment_id: "a1",
      criterion_id: "c1",
      side: "GROUP",
      item_a_id: "B",
      item_b_id: "C",
      evaluator_user_id: "user-1",
      display_left_item_id: "B",
      generation: 1,
      source: "AUTO",
      created_at: new Date().toISOString(),
    },
    {
      id: "p3",
      assignment_id: "a1",
      criterion_id: "c1",
      side: "GROUP",
      item_a_id: "C",
      item_b_id: "A",
      evaluator_user_id: "user-1",
      display_left_item_id: "C",
      generation: 1,
      source: "AUTO",
      created_at: new Date().toISOString(),
    },
  ];

  // In p1: A is left, choice 1 -> A beats B
  // In p2: B is left, choice 1 -> B beats C
  // In p3: C is left, choice 1 -> C beats A
  // Cycle: A > B > C > A!
  const comparisons: Comparison[] = [
    makeComp({ id: "1", pair_assignment_id: "p1", evaluator_user_id: "user-1", choice: 1 }),
    makeComp({ id: "2", pair_assignment_id: "p2", evaluator_user_id: "user-1", choice: 1 }),
    makeComp({ id: "3", pair_assignment_id: "p3", evaluator_user_id: "user-1", choice: 1 }),
  ];

  const signal = checkIntransitivity("user-1", "c1", pairs, comparisons, 0.2);
  assert.ok(signal);
  assert.equal(signal?.code, "QS-04");
  assert.equal(signal?.metric, 1.0);
});

test("QS-05: flags speed run when average task time is < 3000ms", () => {
  const comparisons: Comparison[] = [
    makeComp({ id: "1", pair_assignment_id: "p1", evaluator_user_id: "user-1", choice: 1, time_on_task_ms: 1200 }),
    makeComp({ id: "2", pair_assignment_id: "p2", evaluator_user_id: "user-1", choice: 2, time_on_task_ms: 1500 }),
    makeComp({ id: "3", pair_assignment_id: "p3", evaluator_user_id: "user-1", choice: 3, time_on_task_ms: 900 }),
  ];

  const signal = checkSpeedRun("user-1", comparisons, 3000);
  assert.ok(signal);
  assert.equal(signal?.code, "QS-05");
  assert.equal(signal?.metric, 1200);
});

test("analyzeAssignmentSignals returns all detected signals across the dataset", () => {
  const pairs: PairAssignment[] = [
    {
      id: "p1",
      assignment_id: "a1",
      criterion_id: "c1",
      side: "GROUP",
      item_a_id: "A",
      item_b_id: "B",
      evaluator_user_id: "u1",
      display_left_item_id: "A",
      generation: 1,
      source: "AUTO",
      created_at: new Date().toISOString(),
    },
  ];
  const comparisons: Comparison[] = [
    makeComp({ id: "c1", pair_assignment_id: "p1", evaluator_user_id: "u1", choice: 1 }),
  ];

  const signals = analyzeAssignmentSignals(pairs, comparisons, { minComparisons: 3 });
  assert.ok(signals.some((s) => s.code === "QS-01"));
});
