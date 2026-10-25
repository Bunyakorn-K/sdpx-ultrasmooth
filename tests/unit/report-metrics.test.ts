import test from "node:test";
import assert from "node:assert/strict";
import {
  choiceDistribution,
  COMPARISON_CHOICES,
} from "@/features/pairwise/domain/report-metrics";
import type { Comparison } from "@/features/pairwise/types";

function comparison(
  id: string,
  choice: Comparison["choice"],
  status: Comparison["status"] = "SUBMITTED",
): Comparison {
  return {
    id,
    pair_assignment_id: `pair-${id}`,
    evaluator_user_id: "someone",
    choice,
    status,
    saved_at: new Date().toISOString(),
  };
}

test("FR-REPORT-05: distribution counts every choice point of the scale", () => {
  const { counts, total } = choiceDistribution([
    comparison("a", 1),
    comparison("b", 1),
    comparison("c", 4),
    comparison("d", 6),
  ]);
  assert.equal(total, 4);
  assert.deepEqual(
    COMPARISON_CHOICES.map((choice) => counts.get(choice)),
    [2, 0, 0, 1, 0, 1],
  );
});

test("FR-REPORT-05: distribution ignores drafts and excluded comparisons", () => {
  const { counts, total } = choiceDistribution([
    comparison("a", 2),
    comparison("b", 2, "DRAFT"),
    comparison("c", 2, "EXCLUDED"),
  ]);
  assert.equal(total, 1);
  assert.equal(counts.get(2), 1);
});

test("FR-REPORT-05: distribution starts from zero for an empty comparison set", () => {
  const { counts, total } = choiceDistribution([]);
  assert.equal(total, 0);
  for (const choice of COMPARISON_CHOICES) assert.equal(counts.get(choice), 0);
});

test("FR-REPORT-05: distribution accepts an explicit scale", () => {
  const { counts, total } = choiceDistribution(
    [comparison("a", 3), comparison("b", 3)],
    [3, 4],
  );
  assert.equal(total, 2);
  assert.equal(counts.get(3), 2);
  assert.equal(counts.get(4), 0);
  assert.equal(counts.size, 2);
});
