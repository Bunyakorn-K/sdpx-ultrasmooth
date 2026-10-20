import test from "node:test";
import assert from "node:assert/strict";
import {
  generateGroupPairs,
  generateIndividualPairs,
  solveFeasibility,
} from "@/features/pairwise/domain/pairing-engine";

test("§8.2 Feasibility Example 1: Large classroom (S=200, N=10, R=5)", () => {
  const groups = Array.from({ length: 10 }, (_, i) => ({
    id: `g${i + 1}`,
    name: `Group ${i + 1}`,
    size: 20,
  }));
  const result = solveFeasibility(200, groups, 5, 8);
  assert.equal(result.feasibleR, 5);
  assert.equal(result.workloadK, 2);
  assert.equal(result.totalPairs, 45);
  assert.equal(result.wasReduced, false);
});

test("§8.2 Feasibility Example 2: Small classroom (S=12, N=3, R=5 -> reduced to R=4)", () => {
  const groups = Array.from({ length: 3 }, (_, i) => ({
    id: `g${i + 1}`,
    name: `Group ${i + 1}`,
    size: 4,
  }));
  const result = solveFeasibility(12, groups, 5, 8);
  assert.equal(result.feasibleR, 4);
  assert.equal(result.workloadK, 1);
  assert.equal(result.totalPairs, 3);
  assert.equal(result.wasReduced, true);
  assert.match(result.message!, /แต่ละคู่มีผู้มีสิทธิ์ประเมินสูงสุด 4 คน/);
});

test("Pairing Engine Property-Based Test: verifies Invariants INV-1 to INV-5", () => {
  // Test configuration: 6 groups of 4 students = 24 students
  const groups = Array.from({ length: 6 }, (_, i) => ({
    id: `group-${i + 1}`,
    name: `Group ${i + 1}`,
    size: 4,
  }));

  const students = groups.flatMap((g) =>
    Array.from({ length: g.size }, (_, j) => ({
      id: `student-${g.id}-${j + 1}`,
      groupId: g.id,
    })),
  );

  const seed = 12345;
  const pairs1 = generateGroupPairs("assign-1", "crit-1", students, groups, 5, 8, seed);
  const pairs2 = generateGroupPairs("assign-1", "crit-1", students, groups, 5, 8, seed);

  // INV-5: Deterministic with same seed
  const stripCreatedAt = (p: (typeof pairs1)[number]) => {
    const copy = { ...p };
    delete (copy as { created_at?: string }).created_at;
    return copy;
  };
  assert.deepEqual(
    pairs1.map(stripCreatedAt),
    pairs2.map(stripCreatedAt),
    "INV-5: Same seed must produce identical pair assignments",
  );

  // INV-1: No evaluator receives pair containing own group
  for (const pair of pairs1) {
    const student = students.find((s) => s.id === pair.evaluator_user_id)!;
    assert.notEqual(
      pair.item_a_id,
      student.groupId,
      `INV-1: Evaluator ${student.id} received own group ${student.groupId}`,
    );
    assert.notEqual(
      pair.item_b_id,
      student.groupId,
      `INV-1: Evaluator ${student.id} received own group ${student.groupId}`,
    );
  }

  // INV-2: No evaluator receives duplicate pair in same criterion
  const pairsByEvaluator = new Map<string, string[]>();
  for (const pair of pairs1) {
    const key = [pair.item_a_id, pair.item_b_id].sort().join(":");
    const list = pairsByEvaluator.get(pair.evaluator_user_id) || [];
    assert.equal(
      list.includes(key),
      false,
      `INV-2: Evaluator ${pair.evaluator_user_id} received duplicate pair ${key}`,
    );
    list.push(key);
    pairsByEvaluator.set(pair.evaluator_user_id, list);
  }

  // INV-3: Balanced coverage across all pairs (max(coverage) - min(coverage) <= 1)
  const coverageByPair = new Map<string, number>();
  for (const pair of pairs1) {
    const key = [pair.item_a_id, pair.item_b_id].sort().join(":");
    coverageByPair.set(key, (coverageByPair.get(key) || 0) + 1);
  }
  const coverages = Array.from(coverageByPair.values());
  const maxCoverage = Math.max(...coverages);
  const minCoverage = Math.min(...coverages);
  assert.ok(
    maxCoverage - minCoverage <= 1,
    `INV-3: max(coverage)=${maxCoverage} - min(coverage)=${minCoverage} must be <= 1`,
  );

  // INV-4: Balanced workload per student (max(workload) - min(workload) <= 1)
  const workloads = Array.from(pairsByEvaluator.values()).map((l) => l.length);
  const maxWorkload = Math.max(...workloads);
  const minWorkload = Math.min(...workloads);
  assert.ok(
    maxWorkload - minWorkload <= 1,
    `INV-4: max(workload)=${maxWorkload} - min(workload)=${minWorkload} must be <= 1`,
  );

  // FR-PAIR-08: display_left_item_id is either item_a_id or item_b_id
  for (const pair of pairs1) {
    assert.ok(
      pair.display_left_item_id === pair.item_a_id ||
        pair.display_left_item_id === pair.item_b_id,
    );
  }
});

test("§8.3 Individual Evaluation: complete enumeration and boundaries", () => {
  // Boundary m <= 2: FR-PAIR-12
  const smallGroup = [{ id: "m1" }, { id: "m2" }];
  const emptyPairs = generateIndividualPairs("a1", "c1", "g1", smallGroup);
  assert.equal(emptyPairs.length, 0, "m <= 2 must yield 0 individual pairs");

  // Standard group m = 5:
  // C(5, 2) = 10 pairs. Each member evaluates C(4, 2) = 6 pairs. Total pairs = 5 * 6 = 30.
  // Coverage = m - 2 = 3.
  const groupOf5 = [{ id: "u1" }, { id: "u2" }, { id: "u3" }, { id: "u4" }, { id: "u5" }];
  const indivPairs = generateIndividualPairs("a1", "c1", "g1", groupOf5, 8, 42);

  assert.equal(indivPairs.length, 30);

  // Check that no evaluator evaluates themselves
  for (const pair of indivPairs) {
    assert.notEqual(pair.item_a_id, pair.evaluator_user_id);
    assert.notEqual(pair.item_b_id, pair.evaluator_user_id);
  }

  // Check each member gets exactly 6 pairs
  for (const member of groupOf5) {
    const memberPairs = indivPairs.filter((p) => p.evaluator_user_id === member.id);
    assert.equal(memberPairs.length, 6);
  }

  // Check coverage per pair = 3 (m - 2 = 3)
  const coverageMap = new Map<string, number>();
  for (const pair of indivPairs) {
    const key = [pair.item_a_id, pair.item_b_id].sort().join(":");
    coverageMap.set(key, (coverageMap.get(key) || 0) + 1);
  }
  for (const count of coverageMap.values()) {
    assert.equal(count, 3, "Each pair in group of 5 must receive coverage of exactly 3");
  }
});
