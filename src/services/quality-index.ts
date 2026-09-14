import { and, eq } from "drizzle-orm";

import { db } from "#/db/client";
import { comparisons, pairAssignments } from "#/db/schema";

// PRD §9.1 — 6-point forced choice, points keyed by DISPLAY position
// (left/right), not by item A/B. This must be combined with
// display_left_item_id to attribute points to the correct item: position is
// randomized per pair (FR-PAIR-08), so `choice` alone doesn't say which item
// won — the PRD explicitly warns that skipping this step corrupts the whole
// dataset.
const POINTS_BY_CHOICE: Record<number, { left: number; right: number }> = {
  1: { left: 1.0, right: 0.0 },
  2: { left: 0.8, right: 0.2 },
  3: { left: 0.6, right: 0.4 },
  4: { left: 0.4, right: 0.6 },
  5: { left: 0.2, right: 0.8 },
  6: { left: 0.0, right: 1.0 },
};

export interface QualityIndexResult {
  itemId: number;
  qualityIndex: number;
  comparisonCount: number;
}

export interface ComparisonForScoring {
  itemAId: number;
  itemBId: number;
  displayLeftItemId: number;
  choice: number | null;
}

/**
 * PRD §9.2: q(i) = weighted mean of the points item i received across every
 * comparison it appears in. Pure function — DB fetching lives in
 * computeQualityIndexForCriterion below — so this is unit-testable without a
 * database, following the same pure-core convention as pairing-service.ts.
 *
 * This is intentionally separate from ScoringService.calculateScoresForAssignment
 * (which computes a coarser binary win-rate) — see the M1 plan's note on why:
 * that method and its existing tests stay untouched, and this is the path
 * the real score endpoints use instead.
 */
export function aggregateQualityIndex(rows: ComparisonForScoring[]): QualityIndexResult[] {
  const pointSum = new Map<number, number>();
  const count = new Map<number, number>();

  for (const row of rows) {
    if (row.choice == null) continue;
    const points = POINTS_BY_CHOICE[row.choice];
    if (!points) continue;

    const leftItemId = row.displayLeftItemId;
    const rightItemId = leftItemId === row.itemAId ? row.itemBId : row.itemAId;

    pointSum.set(leftItemId, (pointSum.get(leftItemId) ?? 0) + points.left);
    count.set(leftItemId, (count.get(leftItemId) ?? 0) + 1);
    pointSum.set(rightItemId, (pointSum.get(rightItemId) ?? 0) + points.right);
    count.set(rightItemId, (count.get(rightItemId) ?? 0) + 1);
  }

  return [...pointSum.keys()].map((itemId) => ({
    itemId,
    qualityIndex: Math.round((pointSum.get(itemId)! / count.get(itemId)!) * 100000) / 100000,
    comparisonCount: count.get(itemId)!,
  }));
}

// DR-01 (PRD §11.2): only SUBMITTED comparisons enter the calculation —
// enforced via the status filter below.
export async function computeQualityIndexForCriterion(
  assignmentId: number,
  criterionId: number,
): Promise<QualityIndexResult[]> {
  const rows = await db
    .select({
      itemAId: pairAssignments.itemAId,
      itemBId: pairAssignments.itemBId,
      displayLeftItemId: pairAssignments.displayLeftItemId,
      choice: comparisons.choice,
    })
    .from(comparisons)
    .innerJoin(pairAssignments, eq(comparisons.pairAssignmentId, pairAssignments.id))
    .where(
      and(
        eq(pairAssignments.assignmentId, assignmentId),
        eq(pairAssignments.criterionId, criterionId),
        eq(comparisons.status, "submitted"),
      ),
    );

  return aggregateQualityIndex(rows);
}
