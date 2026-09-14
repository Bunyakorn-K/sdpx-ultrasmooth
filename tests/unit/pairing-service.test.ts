import { describe, expect, it } from "vitest";
import {
  computeFeasibility,
  generateGroupPairs,
  type EvaluatorInput,
  type GroupInput,
} from "#/services/pairing-service";

function makeGroups(sizes: number[]): GroupInput[] {
  return sizes.map((size, index) => ({ id: index + 1, size }));
}

function makeEvaluators(groups: GroupInput[]): EvaluatorInput[] {
  const evaluators: EvaluatorInput[] = [];
  let userId = 1;
  for (const group of groups) {
    for (let i = 0; i < group.size; i++) {
      evaluators.push({ userId: userId++, groupId: group.id });
    }
  }
  return evaluators;
}

describe("computeFeasibility — PRD §8.2 worked examples", () => {
  it("example 1: large room, feasible without reducing coverage", () => {
    const groups = makeGroups(Array(10).fill(20)); // S=200, N=10
    const result = computeFeasibility({ groups, targetCoverage: 5, maxWorkload: 8 });

    expect(result.feasible).toBe(true);
    expect(result.totalPairs).toBe(45);
    expect(result.coverageUsed).toBe(5);
    expect(result.workloadPerEvaluator).toBe(2);
    expect(result.reduced).toBe(false);
  });

  it("example 2: small room, coverage reduced from 5 to 4", () => {
    const groups = makeGroups([4, 4, 4]); // S=12, N=3
    const result = computeFeasibility({ groups, targetCoverage: 5, maxWorkload: 8 });

    expect(result.feasible).toBe(true);
    expect(result.totalPairs).toBe(3);
    expect(result.coverageUsed).toBe(4);
    expect(result.workloadPerEvaluator).toBe(1);
    expect(result.reduced).toBe(true);
    expect(result.message).toContain("4");
  });

  it("2 groups is never feasible — every pair contains the evaluator's own group", () => {
    const groups = makeGroups([4, 4]);
    const result = computeFeasibility({ groups, targetCoverage: 5, maxWorkload: 8 });

    expect(result.feasible).toBe(false);
  });
});

const scenarios: { name: string; sizes: number[] }[] = [
  { name: "3 even groups", sizes: [4, 4, 4] },
  { name: "3 uneven groups", sizes: [3, 5, 4] },
  { name: "5 even groups", sizes: [4, 4, 4, 4, 4] },
  { name: "4 uneven groups", sizes: [3, 4, 5, 6] },
  { name: "10 even groups", sizes: Array(10).fill(20) },
];
const seeds = [1, 2, 3, 42, 12345];

describe("generateGroupPairs — invariants (INV-1..INV-5)", () => {
  for (const scenario of scenarios) {
    for (const seed of seeds) {
      it(`${scenario.name}, seed=${seed}`, () => {
        const groups = makeGroups(scenario.sizes);
        const evaluators = makeEvaluators(groups);
        const { feasibility, pairs } = generateGroupPairs({
          groups,
          evaluators,
          seed,
          targetCoverage: 5,
          maxWorkload: 8,
        });

        expect(feasibility.feasible).toBe(true);
        const groupIdByUserId = new Map(evaluators.map((e) => [e.userId, e.groupId]));

        // INV-1: no evaluator receives a pair containing their own group.
        for (const pair of pairs) {
          const ownGroup = groupIdByUserId.get(pair.evaluatorUserId);
          expect(pair.itemAId).not.toBe(ownGroup);
          expect(pair.itemBId).not.toBe(ownGroup);
        }

        // INV-2: no evaluator receives the same pair twice.
        const seenPerEvaluator = new Map<number, Set<string>>();
        for (const pair of pairs) {
          const key = `${pair.itemAId}-${pair.itemBId}`;
          const seen = seenPerEvaluator.get(pair.evaluatorUserId) ?? new Set<string>();
          expect(seen.has(key)).toBe(false);
          seen.add(key);
          seenPerEvaluator.set(pair.evaluatorUserId, seen);
        }

        // INV-3: coverage spread across pairs is at most 1.
        const coverageByPair = new Map<string, number>();
        for (const pair of pairs) {
          const key = `${pair.itemAId}-${pair.itemBId}`;
          coverageByPair.set(key, (coverageByPair.get(key) ?? 0) + 1);
        }
        const coverageValues = [...coverageByPair.values()];
        expect(Math.max(...coverageValues) - Math.min(...coverageValues)).toBeLessThanOrEqual(1);

        // INV-4: workload spread across evaluators is at most 1.
        const workloadByEvaluator = new Map<number, number>();
        for (const pair of pairs) {
          workloadByEvaluator.set(
            pair.evaluatorUserId,
            (workloadByEvaluator.get(pair.evaluatorUserId) ?? 0) + 1,
          );
        }
        const workloadValues = [...workloadByEvaluator.values()];
        expect(Math.max(...workloadValues) - Math.min(...workloadValues)).toBeLessThanOrEqual(1);

        // INV-5: same seed + input produces an identical result.
        const rerun = generateGroupPairs({
          groups,
          evaluators,
          seed,
          targetCoverage: 5,
          maxWorkload: 8,
        });
        expect(rerun.pairs).toEqual(pairs);
      });
    }
  }
});
