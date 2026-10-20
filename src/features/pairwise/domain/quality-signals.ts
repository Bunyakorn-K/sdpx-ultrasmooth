import type { Comparison, PairAssignment } from "../types";

export type QualitySignalCode =
  | "QS-01" // Low coverage
  | "QS-02" // Straight-lining
  | "QS-03" // Position bias
  | "QS-04" // Intransitivity
  | "QS-05" // Speed run
  | "QS-06" // Self-group favoritism
  | "QS-07"; // Low rater agreement

export type QualitySignal = {
  code: QualitySignalCode;
  name: string;
  targetType: "ITEM" | "EVALUATOR" | "CRITERION";
  targetId: string;
  metric: number;
  threshold: number;
  description: string;
  suggestedAction: string;
};

/**
 * QS-01: Low coverage (< 3 comparisons for an item on a criterion)
 */
export function checkLowCoverage(
  itemId: string,
  criterionId: string,
  comparisonCount: number,
  minComparisons: number = 3,
): QualitySignal | null {
  if (comparisonCount < minComparisons) {
    return {
      code: "QS-01",
      name: "Low coverage",
      targetType: "ITEM",
      targetId: itemId,
      metric: comparisonCount,
      threshold: minComparisons,
      description: `Item ได้รับการประเมินเพียง ${comparisonCount} ครั้ง (เกณฑ์ขั้นต่ำ ${minComparisons})`,
      suggestedAction: "ใช้ 'ส่งประเมินเพิ่ม' เพื่อเพิ่มจำนวนผู้ประเมิน",
    };
  }
  return null;
}

/**
 * QS-02: Straight-lining (evaluator chooses same choice > 80% of answers)
 */
export function checkStraightLining(
  evaluatorId: string,
  comparisons: Comparison[],
  thresholdRatio: number = 0.8,
): QualitySignal | null {
  const submitted = comparisons.filter(
    (c) => c.evaluator_user_id === evaluatorId && c.status === "SUBMITTED",
  );
  if (submitted.length < 3) return null;

  const counts: Record<number, number> = {};
  for (const c of submitted) {
    counts[c.choice] = (counts[c.choice] || 0) + 1;
  }

  const maxCount = Math.max(...Object.values(counts));
  const ratio = maxCount / submitted.length;

  if (ratio > thresholdRatio) {
    return {
      code: "QS-02",
      name: "Straight-lining",
      targetType: "EVALUATOR",
      targetId: evaluatorId,
      metric: Number(ratio.toFixed(3)),
      threshold: thresholdRatio,
      description: `ผู้ประเมินเลือกคะแนนเดิม ${Math.round(ratio * 100)}% ของคำตอบทั้งหมด`,
      suggestedAction: "ทบทวนคำตอบด้วยตา และพิจารณาความน่าเชื่อถือ",
    };
  }
  return null;
}

/**
 * QS-03: Position bias (evaluator chooses left or right > 80%)
 * Choice 1, 2, 3 -> Left
 * Choice 4, 5, 6 -> Right
 */
export function checkPositionBias(
  evaluatorId: string,
  comparisons: Comparison[],
  thresholdRatio: number = 0.8,
): QualitySignal | null {
  const submitted = comparisons.filter(
    (c) => c.evaluator_user_id === evaluatorId && c.status === "SUBMITTED",
  );
  if (submitted.length < 3) return null;

  let leftCount = 0;
  let rightCount = 0;

  for (const c of submitted) {
    if (c.choice <= 3) leftCount++;
    else rightCount++;
  }

  const leftRatio = leftCount / submitted.length;
  const rightRatio = rightCount / submitted.length;
  const maxBias = Math.max(leftRatio, rightRatio);

  if (maxBias > thresholdRatio) {
    const biasedSide = leftRatio > rightRatio ? "ซ้าย" : "ขวา";
    return {
      code: "QS-03",
      name: "Position bias",
      targetType: "EVALUATOR",
      targetId: evaluatorId,
      metric: Number(maxBias.toFixed(3)),
      threshold: thresholdRatio,
      description: `ผู้ประเมินเอนเอียงเลือกฝั่ง${biasedSide} ${Math.round(maxBias * 100)}% ของคำตอบ`,
      suggestedAction: "ทบทวนคำตอบด้วยตา เนื่องจากอาจไม่ได้พิจารณาเนื้องานทั้งสองฝั่ง",
    };
  }
  return null;
}

/**
 * QS-04: Intransitivity (cycle A>B, B>C, C>A in a single evaluator's responses)
 * Threshold: > 20% of testable triples
 */
export function checkIntransitivity(
  evaluatorId: string,
  criterionId: string,
  pairs: PairAssignment[],
  comparisons: Comparison[],
  thresholdRatio: number = 0.2,
): QualitySignal | null {
  const pairMap = new Map<string, PairAssignment>();
  pairs
    .filter((p) => p.criterion_id === criterionId)
    .forEach((p) => pairMap.set(p.id, p));

  const submitted = comparisons.filter(
    (c) =>
      c.evaluator_user_id === evaluatorId &&
      c.status === "SUBMITTED" &&
      pairMap.has(c.pair_assignment_id),
  );

  // Preference map: key `${winner}->${loser}` = true
  const preference = new Map<string, string>(); // pairKey `${a}:${b}` where a is preferred over b

  for (const c of submitted) {
    const pair = pairMap.get(c.pair_assignment_id)!;
    const isLeft = pair.display_left_item_id === pair.item_a_id;
    const leftItem = isLeft ? pair.item_a_id : pair.item_b_id;
    const rightItem = isLeft ? pair.item_b_id : pair.item_a_id;

    if (c.choice <= 3) {
      // Left won
      preference.set(`${leftItem}>${rightItem}`, "win");
    } else {
      // Right won
      preference.set(`${rightItem}>${leftItem}`, "win");
    }
  }

  // Find all items evaluated
  const items = Array.from(
    new Set(
      submitted.flatMap((c) => {
        const p = pairMap.get(c.pair_assignment_id)!;
        return [p.item_a_id, p.item_b_id];
      }),
    ),
  );

  if (items.length < 3) return null;

  let testableTriples = 0;
  let intransitiveTriples = 0;

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      for (let k = j + 1; k < items.length; k++) {
        const a = items[i];
        const b = items[j];
        const c = items[k];

        // Check if all 3 pairs were evaluated between {a, b, c}
        const hasAB = preference.has(`${a}>${b}`) || preference.has(`${b}>${a}`);
        const hasBC = preference.has(`${b}>${c}`) || preference.has(`${c}>${b}`);
        const hasCA = preference.has(`${c}>${a}`) || preference.has(`${a}>${c}`);

        if (hasAB && hasBC && hasCA) {
          testableTriples++;
          const aBeatsB = preference.has(`${a}>${b}`);
          const bBeatsC = preference.has(`${b}>${c}`);
          const cBeatsA = preference.has(`${c}>${a}`);

          const bBeatsA = preference.has(`${b}>${a}`);
          const cBeatsB = preference.has(`${c}>${b}`);
          const aBeatsC = preference.has(`${a}>${c}`);

          // Cycle A > B > C > A OR B > A > C > B
          if ((aBeatsB && bBeatsC && cBeatsA) || (bBeatsA && cBeatsB && aBeatsC)) {
            intransitiveTriples++;
          }
        }
      }
    }
  }

  if (testableTriples === 0) return null;

  const ratio = intransitiveTriples / testableTriples;
  if (ratio > thresholdRatio) {
    return {
      code: "QS-04",
      name: "Intransitivity",
      targetType: "EVALUATOR",
      targetId: evaluatorId,
      metric: Number(ratio.toFixed(3)),
      threshold: thresholdRatio,
      description: `พบการตัดสินใจวนเป็นวงกลม (A>B, B>C, C>A) ${Math.round(ratio * 100)}% ของชุดเปรียบเทียบ 3 ฝั่ง`,
      suggestedAction: "อาจแปลว่าไม่ได้ดูผลงานจริง ตรวจสอบการให้คะแนนของผู้ประเมินรายนี้",
    };
  }
  return null;
}

/**
 * QS-05: Speed run (average time per comparison < 3000 ms)
 */
export function checkSpeedRun(
  evaluatorId: string,
  comparisons: Comparison[],
  thresholdMs: number = 3000,
): QualitySignal | null {
  const submitted = comparisons.filter(
    (c) =>
      c.evaluator_user_id === evaluatorId &&
      c.status === "SUBMITTED" &&
      typeof c.time_on_task_ms === "number" &&
      c.time_on_task_ms > 0,
  );

  if (submitted.length < 3) return null;

  const totalTime = submitted.reduce((sum, c) => sum + (c.time_on_task_ms || 0), 0);
  const avgTime = totalTime / submitted.length;

  if (avgTime < thresholdMs) {
    return {
      code: "QS-05",
      name: "Speed run",
      targetType: "EVALUATOR",
      targetId: evaluatorId,
      metric: Math.round(avgTime),
      threshold: thresholdMs,
      description: `เวลาเฉลี่ยต่อการประเมิน (${(avgTime / 1000).toFixed(1)} วิ) ต่ำกว่าเกณฑ์ (${thresholdMs / 1000} วิ)`,
      suggestedAction: "ทบทวนคำตอบด้วยตา เนื่องจากผู้ประเมินอาจตอบโดยไม่ได้อ่านหรือเปรียบเทียบอย่างถี่ถ้วน",
    };
  }
  return null;
}

/**
 * Aggregate all quality signals for an assignment
 */
export function analyzeAssignmentSignals(
  pairs: PairAssignment[],
  comparisons: Comparison[],
  options?: {
    minComparisons?: number;
    straightLiningThreshold?: number;
    positionBiasThreshold?: number;
    intransitivityThreshold?: number;
    speedRunThresholdMs?: number;
  },
): QualitySignal[] {
  const signals: QualitySignal[] = [];

  // Group pairs by item and criterion for QS-01
  const itemCriterionCounts = new Map<string, number>();
  for (const c of comparisons) {
    if (c.status !== "SUBMITTED") continue;
    const pair = pairs.find((p) => p.id === c.pair_assignment_id);
    if (!pair) continue;
    const keyA = `${pair.item_a_id}:${pair.criterion_id}`;
    const keyB = `${pair.item_b_id}:${pair.criterion_id}`;
    itemCriterionCounts.set(keyA, (itemCriterionCounts.get(keyA) || 0) + 1);
    itemCriterionCounts.set(keyB, (itemCriterionCounts.get(keyB) || 0) + 1);
  }

  for (const [key, count] of itemCriterionCounts.entries()) {
    const [itemId, criterionId] = key.split(":");
    const sig = checkLowCoverage(itemId, criterionId, count, options?.minComparisons ?? 3);
    if (sig) signals.push(sig);
  }

  // Evaluator-based signals (QS-02, QS-03, QS-05)
  const evaluators = Array.from(new Set(comparisons.map((c) => c.evaluator_user_id)));
  for (const evaluatorId of evaluators) {
    const sLine = checkStraightLining(
      evaluatorId,
      comparisons,
      options?.straightLiningThreshold ?? 0.8,
    );
    if (sLine) signals.push(sLine);

    const posBias = checkPositionBias(
      evaluatorId,
      comparisons,
      options?.positionBiasThreshold ?? 0.8,
    );
    if (posBias) signals.push(posBias);

    const speed = checkSpeedRun(
      evaluatorId,
      comparisons,
      options?.speedRunThresholdMs ?? 3000,
    );
    if (speed) signals.push(speed);
  }

  // Evaluator x Criterion intransitivity (QS-04)
  const criteria = Array.from(new Set(pairs.map((p) => p.criterion_id)));
  for (const evaluatorId of evaluators) {
    for (const criterionId of criteria) {
      const intrans = checkIntransitivity(
        evaluatorId,
        criterionId,
        pairs,
        comparisons,
        options?.intransitivityThreshold ?? 0.2,
      );
      if (intrans) signals.push(intrans);
    }
  }

  return signals;
}
