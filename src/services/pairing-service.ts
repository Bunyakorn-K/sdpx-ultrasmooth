import { mulberry32, shuffle } from "#/lib/seeded-rng";

// Group-side pairing engine (PRD §8.2, §8.4). Individual (peer-within-group)
// evaluation is out of scope for M1 — see memory-bank/units/pairing-engine.

export interface GroupInput {
  id: number;
  size: number;
}

export interface EvaluatorInput {
  userId: number;
  /** null for a classroom student who has not joined any group. */
  groupId: number | null;
}

export interface FeasibilityInput {
  groups: GroupInput[];
  targetCoverage: number;
  maxWorkload: number;
  /** Students outside every group; they may evaluate any pair. */
  ungroupedEvaluators?: number;
}

export interface FeasibilityResult {
  feasible: boolean;
  totalPairs: number;
  coverageUsed: number;
  workloadPerEvaluator: number;
  reduced: boolean;
  message: string;
}

function combinations<T>(items: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push([items[i], items[j]]);
    }
  }
  return pairs;
}

/**
 * PRD §8.2 feasibility: starting from the requested coverage R, reduce R
 * until all three constraints hold. Never silently reduce without reporting
 * the numbers used — the caller MUST surface `message` to the instructor.
 */
export function computeFeasibility(input: FeasibilityInput): FeasibilityResult {
  const { groups, targetCoverage, maxWorkload } = input;
  const n = groups.length;
  const groupedCount = groups.reduce((sum, g) => sum + g.size, 0);
  const studentCount = groupedCount + (input.ungroupedEvaluators ?? 0);
  const totalPairs = (n * (n - 1)) / 2;
  const infeasible = (message: string): FeasibilityResult => ({
    feasible: false, totalPairs, coverageUsed: 0, workloadPerEvaluator: 0, reduced: false, message,
  });

  if (n < 2) return infeasible("ต้องมีอย่างน้อย 2 กลุ่มจึงจะสร้าง group evaluation ได้");
  if (studentCount === 0) return infeasible("ยังไม่มีนักศึกษาในห้องที่จะเป็นผู้ประเมิน");

  // A grouped evaluator can never see the n-1 pairs containing their own group.
  const maxPairsPerEvaluator = groupedCount > 0 ? totalPairs - (n - 1) : totalPairs;
  const groupPairSizes = combinations(groups).map(([a, b]) => a.size + b.size);
  const minEligibleForPair = Math.min(...groupPairSizes.map((size) => studentCount - size));

  for (let r = targetCoverage; r >= 1; r--) {
    const slotsNeeded = totalPairs * r;
    const k = Math.ceil(slotsNeeded / studentCount);
    const c1 = k <= maxPairsPerEvaluator;
    const c2 = k <= maxWorkload;
    const c3 = r <= minEligibleForPair;

    if (c1 && c2 && c3) {
      const reduced = r < targetCoverage;
      const message = reduced
        ? `ห้องนี้มี ${n} กลุ่ม จึงตั้ง coverage ได้สูงสุด ${r} ครั้งต่อคู่ (ไม่ใช่ ${targetCoverage} ตามค่าตั้งต้น) นักศึกษาแต่ละคนจะได้ ${k} คู่ต่อเกณฑ์`
        : `Feasible: coverage ${r} ครั้งต่อคู่, ภาระงาน ${k} คู่ต่อคนต่อเกณฑ์ (${totalPairs} คู่ทั้งหมด)`;

      return {
        feasible: true,
        totalPairs,
        coverageUsed: r,
        workloadPerEvaluator: k,
        reduced,
        message,
      };
    }
  }

  // Say which constraint blocks even r = 1 so the instructor knows what to change.
  const minK = Math.ceil(totalPairs / studentCount);
  const reason = minEligibleForPair < 1
    ? "มีคู่กลุ่มที่ไม่มีนักศึกษานอกสองกลุ่มนั้นเหลือให้ประเมิน — เพิ่มกลุ่มหรือนักศึกษาที่ไม่ได้อยู่ในกลุ่มเหล่านั้น"
    : minK > maxPairsPerEvaluator
      ? `มีกลุ่มน้อยเกินไป: นักศึกษาในกลุ่มประเมินได้แค่ ${maxPairsPerEvaluator} คู่ แต่ต้องการ ${minK} คู่ต่อคน — เพิ่มจำนวนกลุ่ม`
      : `workload สูงสุด (${maxWorkload}) ต่ำกว่า ${minK} คู่ต่อคนที่ต้องใช้ — เพิ่ม workload สูงสุด`;
  return infeasible(`ไม่สามารถหา coverage ที่เป็นไปได้แม้จะลดลงเหลือ 1 ครั้งต่อคู่ — ${reason}`);
}

export interface GeneratedPair {
  itemAId: number;
  itemBId: number;
  evaluatorUserId: number;
  displayLeftItemId: number;
}

export interface GeneratePairsInput {
  groups: GroupInput[];
  evaluators: EvaluatorInput[];
  seed: number;
  targetCoverage: number;
  maxWorkload: number;
}

export interface GeneratePairsResult {
  feasibility: FeasibilityResult;
  pairs: GeneratedPair[];
}

const pairKey = (a: number, b: number) => `${a}-${b}`;

// Minimal Edmonds-Karp max-flow, used below to realize the pairing
// assignment as a degree-constrained bipartite subgraph (see comment on
// generateGroupPairs for why this is the correct tool for the job).
class MaxFlowGraph {
  private readonly edgeTo: number[] = [];
  private readonly edgeCap: number[] = [];
  private readonly adjacency: number[][];

  constructor(nodeCount: number) {
    this.adjacency = Array.from({ length: nodeCount }, () => []);
  }

  addEdge(from: number, to: number, capacity: number): void {
    this.adjacency[from].push(this.edgeTo.length);
    this.edgeTo.push(to);
    this.edgeCap.push(capacity);
    this.adjacency[to].push(this.edgeTo.length);
    this.edgeTo.push(from);
    this.edgeCap.push(0);
  }

  /** Flow actually carried on the edge added by the nth call to addEdge. */
  flowOnEdge(edgeCallIndex: number): number {
    return this.edgeCap[edgeCallIndex * 2 + 1];
  }

  /** Adds capacity to the edge added by the nth call to addEdge, keeping its current flow. */
  raiseCapacity(edgeCallIndex: number, delta: number): void {
    this.edgeCap[edgeCallIndex * 2] += delta;
  }

  run(source: number, sink: number): number {
    let totalFlow = 0;
    for (;;) {
      const parentEdge = new Array<number>(this.adjacency.length).fill(-1);
      parentEdge[source] = -2;
      const queue = [source];
      for (let qi = 0; qi < queue.length && parentEdge[sink] === -1; qi++) {
        const u = queue[qi];
        for (const edgeIdx of this.adjacency[u]) {
          const v = this.edgeTo[edgeIdx];
          if (this.edgeCap[edgeIdx] > 0 && parentEdge[v] === -1) {
            parentEdge[v] = edgeIdx;
            queue.push(v);
          }
        }
      }
      if (parentEdge[sink] === -1) return totalFlow;

      let bottleneck = Infinity;
      for (let v = sink; v !== source; ) {
        const edgeIdx = parentEdge[v];
        bottleneck = Math.min(bottleneck, this.edgeCap[edgeIdx]);
        v = this.edgeTo[edgeIdx ^ 1];
      }
      for (let v = sink; v !== source; ) {
        const edgeIdx = parentEdge[v];
        this.edgeCap[edgeIdx] -= bottleneck;
        this.edgeCap[edgeIdx ^ 1] += bottleneck;
        v = this.edgeTo[edgeIdx ^ 1];
      }
      totalFlow += bottleneck;
    }
  }
}

/**
 * PRD §8.4 balanced-coverage allocation.
 *
 * This is a degree-constrained bipartite subgraph problem (each evaluator
 * has a target number of pairs, each pair has a target coverage, and an
 * evaluator may not be linked to a pair containing their own group) — not a
 * plain Gale–Ryser bipartite-degree-sequence realization, because the
 * "own group" exclusions make the host graph incomplete. A per-node greedy
 * (by remaining demand/quota) can get stuck short of a valid solution even
 * when one exists, so this models the problem as max-flow (source →
 * evaluator, capacity = quota; evaluator → pair, capacity 1 if eligible;
 * pair → sink, capacity = coverage) and solves it exactly. Max-flow =
 * total demand iff a feasible assignment exists, which computeFeasibility's
 * three constraints are specifically chosen to guarantee.
 *
 * Deterministic given the same seed + input (INV-5): the evaluator and pair
 * traversal orders fed into the flow graph are shuffled using the seeded
 * RNG, so different seeds explore different (but equally valid) maximum
 * flows, and the same seed always reproduces the same one.
 */
export function generateGroupPairs(input: GeneratePairsInput): GeneratePairsResult {
  const feasibility = computeFeasibility({
    groups: input.groups,
    targetCoverage: input.targetCoverage,
    maxWorkload: input.maxWorkload,
    ungroupedEvaluators: input.evaluators.filter((evaluator) => evaluator.groupId === null).length,
  });

  if (!feasibility.feasible) {
    return { feasibility, pairs: [] };
  }

  const coverage = feasibility.coverageUsed;
  const workload = feasibility.workloadPerEvaluator;
  const rng = mulberry32(input.seed);

  const groupIds = input.groups.map((g) => g.id).sort((a, b) => a - b);
  const allPairs = shuffle(combinations(groupIds), rng);
  const shuffledEvaluators = shuffle(input.evaluators, rng);

  // Total demand doesn't always divide evenly across evaluators, and
  // `workload` (the ceil'd planning number reported to the instructor) can
  // overshoot it. Every evaluator first gets the base quota; the remainder is
  // then handed out by a second flow phase, so the flow itself picks which
  // evaluators take base+1. Fixing those evaluators up front can strand a
  // pair whose only eligible evaluators all landed on the base quota.
  // Augmenting paths never reduce source→evaluator flow, so INV-4's ≤1
  // spread holds whenever phase one saturates every base quota.
  const totalDemand = allPairs.length * coverage;
  const evaluatorCount = shuffledEvaluators.length;
  const baseQuota = Math.min(workload, Math.floor(totalDemand / evaluatorCount));
  const extraQuota = Math.min(workload, baseQuota + 1) - baseQuota;

  const SOURCE = 0;
  const evaluatorNode = (i: number) => 1 + i;
  const pairNode = (i: number) => 1 + evaluatorCount + i;
  const SINK = 1 + evaluatorCount + allPairs.length;

  const graph = new MaxFlowGraph(SINK + 1);
  shuffledEvaluators.forEach((_, i) => graph.addEdge(SOURCE, evaluatorNode(i), baseQuota));
  allPairs.forEach((_, i) => graph.addEdge(pairNode(i), SINK, coverage));

  // evaluator→pair edges are added last and in a fixed (i, j) order, so
  // their addEdge call index is deterministic and recoverable below.
  const evaluatorPairEdgeStart = evaluatorCount + allPairs.length;
  let edgeCallIndex = evaluatorPairEdgeStart;
  const edgeIndexFor = new Map<string, number>();
  shuffledEvaluators.forEach((evaluator, i) => {
    allPairs.forEach(([a, b], j) => {
      if (evaluator.groupId === a || evaluator.groupId === b) return;
      graph.addEdge(evaluatorNode(i), pairNode(j), 1);
      edgeIndexFor.set(`${i}-${j}`, edgeCallIndex++);
    });
  });

  let flow = graph.run(SOURCE, SINK);
  if (flow < totalDemand && extraQuota > 0) {
    // Source→evaluator edges are the first addEdge calls, so call index i is evaluator i.
    shuffledEvaluators.forEach((_, i) => graph.raiseCapacity(i, extraQuota));
    flow += graph.run(SOURCE, SINK);
  }
  // Never publish a partial allocation if the checks above were optimistic.
  if (flow < totalDemand) {
    return {
      feasibility: { ...feasibility, feasible: false, message: "ไม่สามารถจัดคู่ให้ครบตาม coverage ได้ — ลองเพิ่มกลุ่มหรือ workload สูงสุด" },
      pairs: [],
    };
  }

  const generated: GeneratedPair[] = [];
  shuffledEvaluators.forEach((evaluator, i) => {
    allPairs.forEach(([a, b], j) => {
      const edgeCall = edgeIndexFor.get(`${i}-${j}`);
      if (edgeCall === undefined) return;
      if (graph.flowOnEdge(edgeCall) <= 0) return;

      const displayLeftItemId = rng() < 0.5 ? a : b;
      generated.push({ itemAId: a, itemBId: b, evaluatorUserId: evaluator.userId, displayLeftItemId });
    });
  });

  return { feasibility, pairs: generated };
}
