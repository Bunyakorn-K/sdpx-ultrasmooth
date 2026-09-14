import { and, eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { comparisons, groupEntities, pairAssignments } from "#/db/schema";

export interface EvaluationItemView {
  id: number;
  name: string;
  artifactUrl: string | null;
  description: string | null;
}

export interface EvaluationPairView {
  pairAssignmentId: number;
  left: EvaluationItemView;
  right: EvaluationItemView;
  choice: number | null;
  status: "draft" | "saved" | "submitted" | null;
  savedAt: string | null;
}

/**
 * The evaluator's queue for one assignment. Left/right order comes from
 * `display_left_item_id` (FR-PAIR-08's stored random position), never from
 * item id order — that's the whole point of storing it.
 */
export async function getEvaluationQueue(
  assignmentId: number,
  evaluatorUserId: number,
): Promise<EvaluationPairView[]> {
  const rows = await db
    .select({
      pairAssignmentId: pairAssignments.id,
      itemAId: pairAssignments.itemAId,
      itemBId: pairAssignments.itemBId,
      displayLeftItemId: pairAssignments.displayLeftItemId,
      choice: comparisons.choice,
      status: comparisons.status,
      savedAt: comparisons.savedAt,
    })
    .from(pairAssignments)
    .leftJoin(comparisons, eq(comparisons.pairAssignmentId, pairAssignments.id))
    .where(and(eq(pairAssignments.assignmentId, assignmentId), eq(pairAssignments.evaluatorUserId, evaluatorUserId)));

  const groupIds = new Set<number>();
  for (const row of rows) {
    groupIds.add(row.itemAId);
    groupIds.add(row.itemBId);
  }

  const groupRows = groupIds.size > 0 ? await db.select().from(groupEntities).where(inArray(groupEntities.id, [...groupIds])) : [];
  const groupById = new Map(groupRows.map((group) => [group.id, group]));

  const toView = (group: (typeof groupRows)[number]): EvaluationItemView => ({
    id: group.id,
    name: group.name,
    artifactUrl: group.artifactUrl,
    description: group.description,
  });

  return rows.map((row) => {
    const itemA = groupById.get(row.itemAId)!;
    const itemB = groupById.get(row.itemBId)!;
    const isAOnLeft = row.displayLeftItemId === row.itemAId;

    return {
      pairAssignmentId: row.pairAssignmentId,
      left: toView(isAOnLeft ? itemA : itemB),
      right: toView(isAOnLeft ? itemB : itemA),
      choice: row.choice,
      status: row.status,
      savedAt: row.savedAt ? row.savedAt.toISOString() : null,
    };
  });
}
