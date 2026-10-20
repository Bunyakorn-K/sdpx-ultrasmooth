import { and, asc, count, eq } from "drizzle-orm";

import { db, type DbClient } from "#/db/client";
import { assignments, classroomMembers, classrooms, criteria, groupEntities } from "#/db/schema";
import { uniqueSlug } from "#/lib/slug";
import { votingReadiness } from "#/services/voting-readiness";

/**
 * Teachers create assignments directly. Each one gets its own hidden
 * classroom, whose slug is the join code, so membership and permission checks
 * keep working unchanged.
 */
export async function createStandaloneAssignment(userId: number, input: { name: string; deadlineUtc?: string | null }) {
  return db.transaction(async (tx) => {
    const [classroom] = await tx.insert(classrooms)
      .values({ name: input.name, slug: uniqueSlug(input.name), createdBy: userId }).returning();
    await tx.insert(classroomMembers).values({ classroomId: classroom.id, userId, role: "INSTRUCTOR" });
    const [assignment] = await tx.insert(assignments).values({
      classroomId: classroom.id,
      name: input.name,
      slug: uniqueSlug(input.name),
      deadlineUtc: input.deadlineUtc ? new Date(input.deadlineUtc) : null,
      createdBy: userId,
    }).returning();
    return { ...assignment, joinCode: classroom.slug };
  });
}

/** Every assignment the user can open, through any classroom they belong to. */
export async function listMyAssignments(userId: number) {
  return db.select({
    id: assignments.id, name: assignments.name, status: assignments.status, deadlineUtc: assignments.deadlineUtc,
    classroomId: assignments.classroomId, role: classroomMembers.role, joinCode: classrooms.slug,
  }).from(classroomMembers)
    .innerJoin(classrooms, eq(classrooms.id, classroomMembers.classroomId))
    .innerJoin(assignments, eq(assignments.classroomId, classroomMembers.classroomId))
    .where(eq(classroomMembers.userId, userId))
    .orderBy(asc(assignments.createdAt));
}

export async function getAssignment(assignmentId: number) {
  const [assignment] = await db.select().from(assignments).where(eq(assignments.id, assignmentId));
  return assignment ?? null;
}

export class AssignmentNotDraftError extends Error {
  constructor() {
    super("Only DRAFT assignments can be edited or opened for voting.");
    this.name = "AssignmentNotDraftError";
  }
}

// FR-ASSIGN-03: editable only in DRAFT (before voting starts).
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

async function countQuestionsAndGroups(assignmentId: number, database: DbClient = db) {
  const [[questions], [groups]] = await Promise.all([
    database.select({ value: count() }).from(criteria).where(eq(criteria.assignmentId, assignmentId)),
    database.select({ value: count() }).from(groupEntities).where(eq(groupEntities.assignmentId, assignmentId)),
  ]);
  return { questionCount: questions.value, groupCount: groups.value };
}

export async function getVotingReadiness(assignmentId: number) {
  return votingReadiness(await countQuestionsAndGroups(assignmentId));
}

/**
 * Opens voting: DRAFT -> PUBLISHED. Locks the assignment row so a group join
 * or question edit cannot land after the readiness check.
 */
export async function startVoting(assignmentId: number) {
  return db.transaction(async (tx) => {
    const [assignment] = await tx.select().from(assignments).where(eq(assignments.id, assignmentId)).for("update");
    if (!assignment) throw new Error("Assignment not found");
    if (assignment.status !== "DRAFT") throw new AssignmentNotDraftError();
    if (assignment.deadlineUtc && assignment.deadlineUtc <= new Date()) throw new AssignmentNotDraftError();

    const readiness = votingReadiness(await countQuestionsAndGroups(assignmentId, tx));
    if (!readiness.ready) return { readiness, started: false };

    await tx.update(assignments).set({ status: "PUBLISHED", publishedAt: new Date() })
      .where(and(eq(assignments.id, assignmentId), eq(assignments.status, "DRAFT")));
    return { readiness, started: true };
  });
}
