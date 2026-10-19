import { and, eq, inArray } from "drizzle-orm";
import { db } from "#/db/client";
import { assignmentGroupMembers, assignments, classroomMembers, classrooms, comparisons, criteria, groupEntities, pairAssignments } from "#/db/schema";

export async function deleteClassroom(classroomId: number, ownerId: number) {
  return db.transaction(async (tx) => {
    const [classroom] = await tx.select({ id: classrooms.id }).from(classrooms)
      .where(and(eq(classrooms.id, classroomId), eq(classrooms.createdBy, ownerId))).for("update");
    if (!classroom) return false;
    const assignmentIds = tx.select({ id: assignments.id }).from(assignments).where(eq(assignments.classroomId, classroomId));
    // Lock assignments before removing their dependent voting records.
    await tx.select({ id: assignments.id }).from(assignments).where(eq(assignments.classroomId, classroomId)).for("update");
    const pairIds = tx.select({ id: pairAssignments.id }).from(pairAssignments).where(inArray(pairAssignments.assignmentId, assignmentIds));
    await tx.delete(comparisons).where(inArray(comparisons.pairAssignmentId, pairIds));
    await tx.delete(pairAssignments).where(inArray(pairAssignments.assignmentId, assignmentIds));
    await tx.delete(criteria).where(inArray(criteria.assignmentId, assignmentIds));
    await tx.delete(assignmentGroupMembers).where(inArray(assignmentGroupMembers.assignmentId, assignmentIds));
    await tx.delete(classroomMembers).where(eq(classroomMembers.classroomId, classroomId));
    await tx.delete(groupEntities).where(eq(groupEntities.classroomId, classroomId));
    await tx.delete(assignments).where(eq(assignments.classroomId, classroomId));
    await tx.delete(classrooms).where(eq(classrooms.id, classroomId));
    return true;
  });
}
