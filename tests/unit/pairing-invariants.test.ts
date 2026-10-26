import test from "node:test";
import assert from "node:assert/strict";
import { solveFeasibility } from "@/features/pairwise/domain/pairing-engine";
import { previewRegeneration } from "@/features/pairwise/domain/regeneration";
import type { Assignment } from "@/features/assignments/types";

function createTestAssignment(
  numGroups: number,
  membersPerGroup: number,
  targetCoverage = 5,
  maxWorkload = 8,
): Assignment {
  const groups = Array.from({ length: numGroups }, (_, i) => ({
    id: `grp-${i + 1}`,
    name: `Team ${i + 1}`,
    members: Array.from({ length: membersPerGroup }, (_, j) => ({
      id: `usr-g${i + 1}-m${j + 1}`,
      name: `Member ${i + 1}-${j + 1}`,
    })),
  }));

  const a: Assignment = {
    id: `asgn-inv-${numGroups}x${membersPerGroup}`,
    ownerId: "owner-teacher",
    title: "Invariants Testing Assignment",
    description: "Property-based tests for INV-1 through INV-5",
    subject: "Software Testing",
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: "draft",
    questions: ["Quality"],
    groups,
    students: groups.flatMap((g) => g.members),
    votes: [],
    targetCoverage,
    maxWorkload,
    groupMaxScore: 15,
    individualMaxScore: 5,
    createdAt: new Date().toISOString(),
    color: "mint",
  };
  return a;
}

test("Pairing Engine Invariants INV-1 to INV-5 on previewRegeneration (4 groups × 4 students)", () => {
  const asgn = createTestAssignment(4, 4, 5, 8);
  const plan1 = previewRegeneration(asgn, "both");
  const plan2 = previewRegeneration(asgn, "both");

  // INV-5: Determinism - same seed/input produces identical pairs
  assert.equal(plan1.token, plan2.token);
  assert.equal(plan1.pairs.length, plan2.pairs.length);

  const groupPairs = plan1.pairs.filter((p) => p.side === "GROUP");
  const indivPairs = plan1.pairs.filter((p) => p.side === "INDIVIDUAL");

  // INV-1 (FR-PAIR-02): Group eval - evaluator MUST NOT receive pairs containing their own group
  for (const p of groupPairs) {
    const studentGroup = asgn.groups.find((g) =>
      g.members.some((m) => m.id === p.evaluator_user_id),
    );
    assert.ok(studentGroup);
    assert.notEqual(p.item_a_id, studentGroup.id);
    assert.notEqual(p.item_b_id, studentGroup.id);
  }

  // INV-1 (FR-PAIR-03): Individual eval - evaluator MUST NOT receive pairs containing themselves
  // and pairs must only be between members of the same group
  for (const p of indivPairs) {
    assert.notEqual(p.item_a_id, p.evaluator_user_id);
    assert.notEqual(p.item_b_id, p.evaluator_user_id);
    const studentGroup = asgn.groups.find((g) =>
      g.members.some((m) => m.id === p.evaluator_user_id),
    );
    assert.ok(studentGroup);
    assert.ok(studentGroup.members.some((m) => m.id === p.item_a_id));
    assert.ok(studentGroup.members.some((m) => m.id === p.item_b_id));
  }

  // INV-2 (FR-PAIR-07): No evaluator receives the same pair more than once within the same criterion
  const evaluatorPairKeys = new Set<string>();
  for (const p of plan1.pairs) {
    const pairKey = [p.item_a_id, p.item_b_id].sort().join(":");
    const key = `${p.evaluator_user_id}|${p.criterion_id}|${pairKey}`;
    assert.equal(
      evaluatorPairKeys.has(key),
      false,
      `Evaluator ${p.evaluator_user_id} received duplicate pair ${pairKey}`,
    );
    evaluatorPairKeys.add(key);
  }

  // INV-3 (FR-PAIR-06): Balanced pair coverage - max(coverage) - min(coverage) <= 1
  const pairCoverage = new Map<string, number>();
  for (const p of groupPairs) {
    const pairKey = [p.item_a_id, p.item_b_id].sort().join(":");
    pairCoverage.set(pairKey, (pairCoverage.get(pairKey) ?? 0) + 1);
  }
  const coverages = [...pairCoverage.values()];
  const maxCoverage = Math.max(...coverages);
  const minCoverage = Math.min(...coverages);
  assert.ok(
    maxCoverage - minCoverage <= 1,
    `INV-3 violated: coverage differs by ${maxCoverage - minCoverage}`,
  );

  // INV-4 (§8.4): Balanced evaluator workload - max(workload) - min(workload) <= 1
  const studentWorkload = new Map<string, number>();
  asgn.students.forEach((s) => studentWorkload.set(s.id, 0));
  for (const p of groupPairs) {
    studentWorkload.set(
      p.evaluator_user_id,
      studentWorkload.get(p.evaluator_user_id)! + 1,
    );
  }
  const workloads = [...studentWorkload.values()];
  const maxWorkload = Math.max(...workloads);
  const minWorkload = Math.min(...workloads);
  assert.ok(
    maxWorkload - minWorkload <= 1,
    `INV-4 violated: workload differs by ${maxWorkload - minWorkload} (min=${minWorkload}, max=${maxWorkload})`,
  );

  // FR-PAIR-08: Randomized left/right display position
  let leftMatchesA = 0;
  let leftMatchesB = 0;
  for (const p of plan1.pairs) {
    assert.ok(
      p.display_left_item_id === p.item_a_id ||
        p.display_left_item_id === p.item_b_id,
    );
    if (p.display_left_item_id === p.item_a_id) leftMatchesA++;
    else leftMatchesB++;
  }
  assert.ok(leftMatchesA > 0);
  assert.ok(leftMatchesB > 0);
});

test("FR-PAIR-04 & FR-PAIR-05: Feasibility calculation with auto-reduction and numeric explanation", () => {
  // S = 12, N = 3 (groups of 4), R = 5
  // Total pairs P = 3. Each pair has 12 - 4 - 4 = 4 eligible evaluators.
  // Maximum possible coverage is R = 4.
  const groups = [
    { id: "g1", name: "G1", size: 4 },
    { id: "g2", name: "G2", size: 4 },
    { id: "g3", name: "G3", size: 4 },
  ];
  const result = solveFeasibility(12, groups, 5, 8);

  assert.equal(result.wasReduced, true);
  assert.equal(result.feasibleR, 4);
  assert.equal(result.workloadK, 1);
  assert.ok(result.message);
  assert.match(
    result.message,
    /แต่ละคู่มีผู้มีสิทธิ์ประเมินสูงสุด 4 คน จึงตั้ง coverage ได้สูงสุด 4 ครั้งต่อคู่/,
  );
});

test("FR-PAIR-12 & FR-PAIR-13: Individual evaluation group size rules (m <= 2 disabled, m = 3 allowed)", () => {
  // Groups of size 2: individual evaluation is disabled
  const asgnM2 = createTestAssignment(3, 2);
  const planM2 = previewRegeneration(asgnM2, "both");
  assert.equal(
    planM2.pairs.some((p) => p.side === "INDIVIDUAL"),
    false,
  );

  // Groups of size 3: individual evaluation is enabled
  const asgnM3 = createTestAssignment(3, 3);
  const planM3 = previewRegeneration(asgnM3, "both");
  const indivPairs = planM3.pairs.filter((p) => p.side === "INDIVIDUAL");
  assert.ok(indivPairs.length > 0);
});
