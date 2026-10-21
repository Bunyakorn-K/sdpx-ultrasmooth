import type {
  Comparison,
  ComparisonChoice,
  Criterion,
  PairAssignment,
  Role,
} from "../types";

export const CHOICE_POINTS: Record<
  ComparisonChoice,
  { s_left: number; s_right: number; label: string }
> = {
  1: { s_left: 1.0, s_right: 0.0, label: "ซ้ายดีกว่ามาก" },
  2: { s_left: 0.8, s_right: 0.2, label: "ซ้ายดีกว่า" },
  3: { s_left: 0.6, s_right: 0.4, label: "ซ้ายดีกว่าเล็กน้อย" },
  4: { s_left: 0.4, s_right: 0.6, label: "ขวาดีกว่าเล็กน้อย" },
  5: { s_left: 0.2, s_right: 0.8, label: "ขวาดีกว่า" },
  6: { s_left: 0.0, s_right: 1.0, label: "ขวาดีกว่ามาก" },
};

export type EvaluatorRoleMap = Record<string, Role>;

export function getComparisonPoints(
  comparison: Comparison,
  pair: PairAssignment,
  itemId: string,
): number {
  const isLeft = pair.display_left_item_id === itemId;
  const points = CHOICE_POINTS[comparison.choice];
  return isLeft ? points.s_left : points.s_right;
}

export function calculateQualityIndex(
  itemId: string,
  criterionId: string,
  pairs: PairAssignment[],
  comparisons: Comparison[],
  evaluatorRoles: EvaluatorRoleMap = {},
  instructorWeight: number = 1.0,
): { q: number; comparisonCount: number; effectiveWeightSum: number } {
  const pairMap = new Map<string, PairAssignment>();
  pairs
    .filter((p) => p.criterion_id === criterionId)
    .forEach((p) => pairMap.set(p.id, p));

  let weightedPointsSum = 0;
  let weightSum = 0;
  let count = 0;

  for (const comp of comparisons) {
    if (comp.status !== "SUBMITTED") continue;
    const pair = pairMap.get(comp.pair_assignment_id);
    if (!pair) continue;
    if (pair.item_a_id !== itemId && pair.item_b_id !== itemId) continue;

    const points = getComparisonPoints(comp, pair, itemId);
    const role = evaluatorRoles[comp.evaluator_user_id];
    const isInstructor = role === "OWNER" || role === "CO_TEACHER";
    const weight = isInstructor ? instructorWeight : 1.0;

    weightedPointsSum += weight * points;
    weightSum += weight;
    count++;
  }

  if (weightSum === 0) {
    return { q: 0.5, comparisonCount: 0, effectiveWeightSum: 0 };
  }

  return {
    q: Number((weightedPointsSum / weightSum).toFixed(5)),
    comparisonCount: count,
    effectiveWeightSum: Number(weightSum.toFixed(3)),
  };
}

export function calculateScoreRatio(
  q: number,
  floor: number = 0.6,
  ceiling: number = 1.0,
): number {
  const ratio = floor + (ceiling - floor) * q;
  return Number(ratio.toFixed(5));
}

export function calculateWeightedScore(
  scoreRatio: number,
  weightPct: number,
  maxScoreSide: number,
): number {
  const score = scoreRatio * (weightPct / 100) * maxScoreSide;
  return Number(score.toFixed(3));
}

export function calculateParticipation(
  submittedComparisons: number,
  assignedComparisons: number,
): number {
  if (assignedComparisons === 0) return 1.0;
  return Number(
    Math.min(1.0, submittedComparisons / assignedComparisons).toFixed(4),
  );
}

export function calculateParticipationMultiplier(
  participationRatio: number,
  completionThreshold: number = 0.9,
): number {
  if (completionThreshold <= 0) return 1.0;
  const multiplier = Math.min(1.0, participationRatio / completionThreshold);
  return Number(multiplier.toFixed(4));
}

export function calculateItemScores(
  itemId: string,
  side: "GROUP" | "INDIVIDUAL",
  criteria: Criterion[],
  pairs: PairAssignment[],
  comparisons: Comparison[],
  maxScoreSide: number,
  scoreFloor: number = 0.6,
  scoreCeiling: number = 1.0,
  minComparisons: number = 3,
  evaluatorRoles: EvaluatorRoleMap = {},
  instructorWeight: number = 1.0,
) {
  const sideCriteria = criteria.filter((c) => c.side === side);
  const criterionScores = sideCriteria.map((criterion) => {
    const { q, comparisonCount } = calculateQualityIndex(
      itemId,
      criterion.id,
      pairs,
      comparisons,
      evaluatorRoles,
      instructorWeight,
    );
    const scoreRatio = calculateScoreRatio(q, scoreFloor, scoreCeiling);
    const weightedScore = calculateWeightedScore(
      scoreRatio,
      criterion.weight_pct,
      maxScoreSide,
    );
    const flags: string[] = [];
    if (comparisonCount < minComparisons) {
      flags.push("LOW_CONFIDENCE");
    }
    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      weightPct: criterion.weight_pct,
      q,
      comparisonCount,
      scoreRatio,
      weightedScore,
      flags,
    };
  });

  const totalScore = Number(
    criterionScores
      .reduce((sum, item) => sum + item.weightedScore, 0)
      .toFixed(3),
  );

  const kAnonymity =
    side === "INDIVIDUAL"
      ? checkKAnonymityThreshold(itemId, comparisons, pairs, minComparisons)
      : { isSatisfied: true, submittedEvaluatorsCount: 0, kMin: minComparisons };

  return {
    itemId,
    side,
    criterionScores,
    totalScore,
    kAnonymity,
    displayScore: kAnonymity.isSatisfied ? totalScore : null,
    displayStatus: kAnonymity.isSatisfied ? null : "ยังมีข้อมูลไม่พอ",
  };
}

/**
 * FR-ANON-02: k-anonymity threshold
 * ไม่แสดงคะแนน individual แก่เจ้าตัว จนกว่าจะมีผู้ประเมินที่ submit แล้ว >= k_min (default 3)
 */
export interface KAnonymityCheck {
  isSatisfied: boolean;
  submittedEvaluatorsCount: number;
  kMin: number;
  statusMessage?: string;
}

export function checkKAnonymityThreshold(
  itemId: string,
  comparisons: Comparison[],
  pairs: PairAssignment[],
  kMin: number = 3,
): KAnonymityCheck {
  const pairMap = new Map(pairs.map((p) => [p.id, p]));
  const submittedEvaluators = new Set<string>();

  for (const comp of comparisons) {
    if (comp.status !== "SUBMITTED") continue;
    const pair = pairMap.get(comp.pair_assignment_id);
    if (!pair) continue;
    if (pair.item_a_id === itemId || pair.item_b_id === itemId) {
      submittedEvaluators.add(comp.evaluator_user_id);
    }
  }

  const count = submittedEvaluators.size;
  const isSatisfied = count >= kMin;
  return {
    isSatisfied,
    submittedEvaluatorsCount: count,
    kMin,
    statusMessage: isSatisfied ? undefined : "ยังมีข้อมูลไม่พอ",
  };
}

/**
 * FR-ANON-04: ในกลุ่มขนาด m = 3 เตือนว่า anonymity ต่ำมาก
 */
export function getGroupAnonymityWarning(groupSize: number): string | null {
  if (groupSize === 3) {
    return "ในกลุ่มขนาด 3 คน ความเป็นนิรนาม (Anonymity) ต่ำมาก และควรให้ปิด individual evaluation ได้ (FR-ANON-04)";
  }
  return null;
}

