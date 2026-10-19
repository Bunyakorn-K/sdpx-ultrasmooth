import { and, asc, eq } from "drizzle-orm";
import { db } from "#/db/client";
import { assignments, assignmentGroupMembers, groupEntities, users } from "#/db/schema";
import { GroupRuleError, parseGroupInput, requireOpenEnrollment } from "./group-rules";

export async function listAssignmentGroups(assignmentId: number, userId: number, teacher = false) {
  const [groups, members] = await Promise.all([
    db.select({ id: groupEntities.id, name: groupEntities.name,
      description: groupEntities.description, artifactUrl: groupEntities.artifactUrl })
      .from(groupEntities).where(eq(groupEntities.assignmentId, assignmentId)).orderBy(asc(groupEntities.id)),
    db.select({ groupId: assignmentGroupMembers.groupId, userId: users.id,
      displayName: users.displayName, email: users.emailRaw })
      .from(assignmentGroupMembers).innerJoin(users, eq(users.id, assignmentGroupMembers.userId))
      .where(eq(assignmentGroupMembers.assignmentId, assignmentId)).orderBy(asc(assignmentGroupMembers.id)),
  ]);
  const myGroupId = members.find((member) => member.userId === userId)?.groupId ?? null;
  return {
    myGroupId,
    groups: groups.map((group) => {
      const groupMembers = members.filter((member) => member.groupId === group.id);
      // Only instructors see who joined; students just see how many.
      return { ...group, memberCount: groupMembers.length,
        members: teacher ? groupMembers.map(({ userId: id, displayName, email }) => ({ id, name: displayName ?? email })) : [] };
    }),
  };
}

export async function deleteAssignmentGroup(assignmentId: number, groupId: number) {
  return db.transaction(async (tx) => {
    // Share the publication/enrollment lock so deletion cannot race voting.
    const [assignment] = await tx.select().from(assignments).where(eq(assignments.id, assignmentId)).for("update");
    if (!assignment) throw new GroupRuleError(404, "Assignment not found.");
    requireOpenEnrollment(assignment);
    const scope = and(eq(groupEntities.id, groupId), eq(groupEntities.assignmentId, assignmentId));
    const [group] = await tx.select({ id: groupEntities.id }).from(groupEntities).where(scope);
    if (!group) throw new GroupRuleError(404, "Group not found in this assignment.");
    await tx.delete(assignmentGroupMembers).where(and(eq(assignmentGroupMembers.assignmentId, assignmentId), eq(assignmentGroupMembers.groupId, groupId)));
    await tx.delete(groupEntities).where(scope);
  });
}

export async function enrollGroup(assignmentId: number, userId: number, teacher: boolean, body: unknown) {
  return db.transaction(async (tx) => {
    // Serialize enrollment and publication against the same assignment row.
    const [assignment] = await tx.select().from(assignments).where(eq(assignments.id, assignmentId)).for("update");
    if (!assignment) throw new GroupRuleError(404, "Assignment not found.");
    requireOpenEnrollment(assignment);
    if (!teacher) {
      // One group per student per assignment: no switching, and no creating extra groups.
      const [membership] = await tx.select({ groupId: assignmentGroupMembers.groupId }).from(assignmentGroupMembers)
        .where(and(eq(assignmentGroupMembers.assignmentId, assignmentId), eq(assignmentGroupMembers.userId, userId)));
      if (membership) throw new GroupRuleError(409, "You already joined a group for this assignment.");
    }
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    let groupId: number;
    if (input.groupId !== undefined) {
      if (teacher) throw new GroupRuleError(403, "Only students join groups.");
      if (!Number.isSafeInteger(input.groupId) || Number(input.groupId) <= 0) throw new GroupRuleError(400, "Invalid group.");
      const [group] = await tx.select().from(groupEntities).where(and(
        eq(groupEntities.id, Number(input.groupId)), eq(groupEntities.assignmentId, assignmentId)));
      if (!group) throw new GroupRuleError(404, "Group not found in this assignment.");
      groupId = group.id;
    } else {
      const values = parseGroupInput(input);
      const [group] = await tx.insert(groupEntities).values({ ...values,
        classroomId: assignment.classroomId, assignmentId }).onConflictDoNothing().returning();
      if (!group) throw new GroupRuleError(409, "That group name is already used in this assignment.");
      groupId = group.id;
    }
    if (!teacher) {
      await tx.insert(assignmentGroupMembers).values({ assignmentId, groupId, userId });
    }
    return { groupId };
  });
}
