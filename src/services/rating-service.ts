import { and, asc, eq } from "drizzle-orm";
import { db } from "#/db/client";
import { assignmentGroupMembers, criteria, groupEntities, ratings } from "#/db/schema";

async function ownGroupId(assignmentId: number, userId: number) {
  const [membership] = await db.select({ groupId: assignmentGroupMembers.groupId }).from(assignmentGroupMembers)
    .where(and(eq(assignmentGroupMembers.assignmentId, assignmentId), eq(assignmentGroupMembers.userId, userId)));
  return membership?.groupId ?? null;
}

/** What one student scores: every question for every group except their own, plus scores already given. */
export async function getVotingSheet(assignmentId: number, userId: number) {
  const [myGroupId, questions, groups, given] = await Promise.all([
    ownGroupId(assignmentId, userId),
    db.select({ id: criteria.id, text: criteria.name }).from(criteria)
      .where(eq(criteria.assignmentId, assignmentId)).orderBy(asc(criteria.displayOrder), asc(criteria.id)),
    db.select({ id: groupEntities.id, name: groupEntities.name, description: groupEntities.description,
      artifactUrl: groupEntities.artifactUrl }).from(groupEntities)
      .where(eq(groupEntities.assignmentId, assignmentId)).orderBy(asc(groupEntities.id)),
    db.select({ questionId: ratings.criterionId, groupId: ratings.groupId, score: ratings.score }).from(ratings)
      .where(and(eq(ratings.assignmentId, assignmentId), eq(ratings.evaluatorUserId, userId))),
  ]);
  return { myGroupId, questions, groups: groups.filter((group) => group.id !== myGroupId), ratings: given };
}

export async function getOwnGroupId(assignmentId: number, userId: number) {
  return ownGroupId(assignmentId, userId);
}

/** Returns false when the question or group is not part of this assignment. */
export async function saveRating(assignmentId: number, userId: number, input: { questionId: number; groupId: number; score: number }) {
  const [[question], [group]] = await Promise.all([
    db.select({ id: criteria.id }).from(criteria)
      .where(and(eq(criteria.id, input.questionId), eq(criteria.assignmentId, assignmentId))),
    db.select({ id: groupEntities.id }).from(groupEntities)
      .where(and(eq(groupEntities.id, input.groupId), eq(groupEntities.assignmentId, assignmentId))),
  ]);
  if (!question || !group) return false;
  // Idempotent: a student changes their score by sending it again.
  await db.insert(ratings).values({ assignmentId, criterionId: question.id, groupId: group.id,
    evaluatorUserId: userId, score: input.score })
    .onConflictDoUpdate({ target: [ratings.criterionId, ratings.groupId, ratings.evaluatorUserId],
      set: { score: input.score, updatedAt: new Date() } });
  return true;
}
