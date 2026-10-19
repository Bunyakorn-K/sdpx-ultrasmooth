import { and, eq, isNull } from "drizzle-orm";

import { db, type DbClient } from "#/db/client";
import { assignments, assignmentGroupMembers, classroomMembers, criteria, groupEntities, pairAssignments } from "#/db/schema";
import { uniqueSlug } from "#/lib/slug";
import {
  computeFeasibility,
  generateGroupPairs,
  type EvaluatorInput,
  type GroupInput,
} from "#/services/pairing-service";

export async function createAssignment(
  classroomId: number,
  userId: number,
  input: { name: string; groupMaxScore?: number; deadlineUtc?: string | null },
) {
  return db.transaction(async (tx) => {
    const [assignment] = await tx.insert(assignments).values({
      classroomId,
      name: input.name,
      slug: uniqueSlug(input.name),
      groupMaxScore: String(input.groupMaxScore ?? 100),
      deadlineUtc: input.deadlineUtc ? new Date(input.deadlineUtc) : null,
      createdBy: userId,
    }).returning();
    // The initial workflow uses one full-weight criterion.
    await tx.insert(criteria).values({
      assignmentId: assignment.id, name: "Overall quality", weightPct: "100", displayOrder: 0,
    });
    return assignment;
  });
}

export async function listAssignments(classroomId: number) {
  return db.select().from(assignments).where(eq(assignments.classroomId, classroomId));
}

export async function getAssignment(assignmentId: number) {
  const [assignment] = await db.select().from(assignments).where(eq(assignments.id, assignmentId));
  return assignment ?? null;
}

export class AssignmentNotDraftError extends Error {
  constructor() {
    super("Only DRAFT assignments can be edited or published.");
    this.name = "AssignmentNotDraftError";
  }
}

// FR-ASSIGN-03: editable only in DRAFT.
export async function updateAssignment(
  assignmentId: number,
  patch: { name?: string; groupMaxScore?: number; deadlineUtc?: string | null },
) {
  const assignment = await getAssignment(assignmentId);
  if (!assignment) throw new Error("Assignment not found");
  if (assignment.status !== "DRAFT") throw new AssignmentNotDraftError();

  const [updated] = await db
    .update(assignments)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.groupMaxScore !== undefined ? { groupMaxScore: String(patch.groupMaxScore) } : {}),
      ...(patch.deadlineUtc !== undefined
        ? { deadlineUtc: patch.deadlineUtc ? new Date(patch.deadlineUtc) : null }
        : {}),
    })
    .where(and(eq(assignments.id, assignmentId), eq(assignments.status, "DRAFT")))
    .returning();

  if (!updated) throw new AssignmentNotDraftError();
  return updated;
}

async function loadGroupsAndEvaluators(classroomId: number, assignmentId: number, database: DbClient = db) {
  const enrolledGroups = await database.select().from(groupEntities).where(eq(groupEntities.assignmentId, assignmentId));
  if (enrolledGroups.length > 0) {
    const enrolled = await database.select().from(assignmentGroupMembers)
      .where(eq(assignmentGroupMembers.assignmentId, assignmentId));
    const students = await database.select({ userId: classroomMembers.userId }).from(classroomMembers)
      .where(and(eq(classroomMembers.classroomId, classroomId), eq(classroomMembers.role, "STUDENT")));
    const groupByUser = new Map(enrolled.map((member) => [member.userId, member.groupId]));
    // Students who did not join a group still vote, on any pair (e.g. teacher-provided answers).
    const ungrouped = students.filter((student) => !groupByUser.has(student.userId))
      .map((student) => ({ userId: student.userId, groupId: null }));
    return {
      groups: enrolledGroups.map((group) => ({ id: group.id, size: enrolled.filter((m) => m.groupId === group.id).length })),
      evaluators: [...enrolled.map((member) => ({ userId: member.userId, groupId: member.groupId })), ...ungrouped],
    };
  }
  const members = await database
    .select({ userId: classroomMembers.userId, groupId: classroomMembers.groupId })
    .from(classroomMembers)
    .where(and(eq(classroomMembers.classroomId, classroomId), eq(classroomMembers.role, "STUDENT")));

  const groupRows = await database.select().from(groupEntities).where(and(
    eq(groupEntities.classroomId, classroomId), isNull(groupEntities.assignmentId)));

  const sizeByGroup = new Map<number, number>();
  for (const member of members) {
    if (member.groupId == null) continue;
    sizeByGroup.set(member.groupId, (sizeByGroup.get(member.groupId) ?? 0) + 1);
  }

  const groups: GroupInput[] = groupRows
    .map((group) => ({ id: group.id, size: sizeByGroup.get(group.id) ?? 0 }))
    .filter((group) => group.size > 0);

  const evaluators: EvaluatorInput[] = members
    .filter((member): member is { userId: number; groupId: number } => member.groupId != null)
    .map((member) => ({ userId: member.userId, groupId: member.groupId }));

  return { groups, evaluators };
}

export async function getAssignmentFeasibility(assignmentId: number) {
  const assignment = await getAssignment(assignmentId);
  if (!assignment) return null;

  const { groups, evaluators } = await loadGroupsAndEvaluators(assignment.classroomId, assignmentId);
  return computeFeasibility({
    groups,
    targetCoverage: assignment.targetCoverage,
    maxWorkload: assignment.maxWorkload,
    ungroupedEvaluators: evaluators.filter((evaluator) => evaluator.groupId === null).length,
  });
}

/**
 * FR-PAIR-01/04/05: computes feasibility, generates and persists pairs, and
 * flips the assignment to PUBLISHED in one transaction. Never partially
 * writes pairs for an infeasible run.
 */
export async function publishAssignment(assignmentId: number) {
  return db.transaction(async (tx) => {
    const [assignment] = await tx.select().from(assignments).where(eq(assignments.id, assignmentId)).for("update");
    if (!assignment) throw new Error("Assignment not found");
    if (assignment.status !== "DRAFT") throw new AssignmentNotDraftError();

    if (assignment.deadlineUtc && assignment.deadlineUtc <= new Date()) throw new AssignmentNotDraftError();
    const [criterion] = await tx.select().from(criteria).where(eq(criteria.assignmentId, assignmentId));
    if (!criterion) throw new Error("Assignment has no criterion");

    const { groups, evaluators } = await loadGroupsAndEvaluators(assignment.classroomId, assignmentId, tx);
    const seed = Date.now();
    const { feasibility, pairs } = generateGroupPairs({
      groups,
      evaluators,
      seed,
      targetCoverage: assignment.targetCoverage,
      maxWorkload: assignment.maxWorkload,
    });

    if (!feasibility.feasible) return { feasibility, published: false };

    if (pairs.length > 0) {
      await tx.insert(pairAssignments).values(
        pairs.map((pair) => ({
          assignmentId,
          criterionId: criterion.id,
          itemAId: pair.itemAId,
          itemBId: pair.itemBId,
          evaluatorUserId: pair.evaluatorUserId,
          displayLeftItemId: pair.displayLeftItemId,
        })),
      );
    }

    await tx
      .update(assignments)
      .set({ status: "PUBLISHED", publishedAt: new Date(), pairingSeed: seed })
      .where(eq(assignments.id, assignmentId));
    return { feasibility, published: true };
  });
}
