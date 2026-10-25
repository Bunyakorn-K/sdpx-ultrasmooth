import type { Comparison } from "../types";

export const COMPARISON_CHOICES = [1, 2, 3, 4, 5, 6] as const;

/**
 * FR-REPORT-05: how many submitted comparisons landed on each choice of the
 * six-point scale for one criterion, so the teacher sees how the room spread
 * instead of only its averages. Draft and excluded comparisons are ignored, the
 * same way every other report counts them.
 */
export function choiceDistribution(
  comparisons: readonly Comparison[],
  choices: readonly number[] = COMPARISON_CHOICES,
): { counts: Map<number, number>; total: number } {
  const counts = new Map<number, number>(choices.map((choice) => [choice, 0]));
  let total = 0;
  for (const comparison of comparisons) {
    if (comparison.status !== "SUBMITTED") continue;
    counts.set(comparison.choice, (counts.get(comparison.choice) ?? 0) + 1);
    total += 1;
  }
  return { counts, total };
}
