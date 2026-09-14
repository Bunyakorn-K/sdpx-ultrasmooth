import { and, count, eq } from "drizzle-orm";

import { db } from "#/db/client";
import { comparisons, pairAssignments } from "#/db/schema";
import { Comparison, ComparisonRepository } from "#/repositories/comparison-repository";

// DR-01 (PRD §11.2): only SUBMITTED comparisons enter the calculation —
// enforced here, once, so ScoringService never has to know about status.
export class DrizzleComparisonRepository implements ComparisonRepository {
  async findByAssignmentId(assignmentId: number): Promise<Comparison[]> {
    const rows = await db
      .select({
        id: comparisons.id,
        pairAssignmentId: comparisons.pairAssignmentId,
        evaluatorId: comparisons.evaluatorUserId,
        itemAId: pairAssignments.itemAId,
        itemBId: pairAssignments.itemBId,
        choice: comparisons.choice,
        status: comparisons.status,
      })
      .from(comparisons)
      .innerJoin(pairAssignments, eq(comparisons.pairAssignmentId, pairAssignments.id))
      .where(and(eq(pairAssignments.assignmentId, assignmentId), eq(comparisons.status, "submitted")));

    return rows.map((row) => ({
      id: row.id,
      assignmentId,
      evaluatorId: row.evaluatorId,
      itemAId: row.itemAId,
      itemBId: row.itemBId,
      choice: row.choice ?? 0,
      status: row.status,
      pairAssignmentId: row.pairAssignmentId,
    }));
  }

  async save(comparison: Comparison): Promise<Comparison> {
    if (!comparison.pairAssignmentId) {
      throw new Error("pairAssignmentId is required to save a comparison");
    }

    const now = new Date();
    const submittedAt = comparison.status === "submitted" ? now : null;

    const [row] = await db
      .insert(comparisons)
      .values({
        pairAssignmentId: comparison.pairAssignmentId,
        evaluatorUserId: comparison.evaluatorId,
        choice: comparison.choice,
        status: comparison.status,
        savedAt: now,
        submittedAt,
      })
      .onConflictDoUpdate({
        target: comparisons.pairAssignmentId,
        set: {
          choice: comparison.choice,
          status: comparison.status,
          savedAt: now,
          submittedAt,
        },
      })
      .returning();

    return {
      id: row.id,
      assignmentId: comparison.assignmentId,
      evaluatorId: row.evaluatorUserId,
      itemAId: comparison.itemAId,
      itemBId: comparison.itemBId,
      choice: row.choice ?? 0,
      status: row.status,
      pairAssignmentId: row.pairAssignmentId,
    };
  }

  async countByAssignmentId(assignmentId: number): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(comparisons)
      .innerJoin(pairAssignments, eq(comparisons.pairAssignmentId, pairAssignments.id))
      .where(and(eq(pairAssignments.assignmentId, assignmentId), eq(comparisons.status, "submitted")));

    return row?.value ?? 0;
  }
}
