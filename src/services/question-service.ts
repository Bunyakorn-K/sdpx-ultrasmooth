import { and, asc, count, eq } from "drizzle-orm";
import { db } from "#/db/client";
import { assignments, criteria, ratings } from "#/db/schema";
import { GroupRuleError, requireOpenEnrollment } from "./group-rules";

const MAX_QUESTION_LENGTH = 300;

export async function listQuestions(assignmentId: number) {
  return db.select({ id: criteria.id, text: criteria.name }).from(criteria)
    .where(eq(criteria.assignmentId, assignmentId)).orderBy(asc(criteria.displayOrder), asc(criteria.id));
}

export async function addQuestion(assignmentId: number, body: unknown) {
  const raw = body && typeof body === "object" && "text" in body ? body.text : null;
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text || text.length > MAX_QUESTION_LENGTH) {
    throw new GroupRuleError(400, `Write a question of 1–${MAX_QUESTION_LENGTH} characters.`);
  }
  return db.transaction(async (tx) => {
    // Questions freeze once voting starts, like groups.
    const [assignment] = await tx.select().from(assignments).where(eq(assignments.id, assignmentId)).for("update");
    if (!assignment) throw new GroupRuleError(404, "Assignment not found.");
    requireOpenEnrollment(assignment);
    const [{ value: existing }] = await tx.select({ value: count() }).from(criteria).where(eq(criteria.assignmentId, assignmentId));
    const [question] = await tx.insert(criteria).values({ assignmentId, name: text, displayOrder: existing })
      .returning({ id: criteria.id, text: criteria.name });
    return question;
  });
}

export async function deleteQuestion(assignmentId: number, questionId: number) {
  return db.transaction(async (tx) => {
    const [assignment] = await tx.select().from(assignments).where(eq(assignments.id, assignmentId)).for("update");
    if (!assignment) throw new GroupRuleError(404, "Assignment not found.");
    requireOpenEnrollment(assignment);
    const scope = and(eq(criteria.id, questionId), eq(criteria.assignmentId, assignmentId));
    await tx.delete(ratings).where(eq(ratings.criterionId, questionId));
    const deleted = await tx.delete(criteria).where(scope).returning({ id: criteria.id });
    if (deleted.length === 0) throw new GroupRuleError(404, "Question not found in this assignment.");
  });
}
