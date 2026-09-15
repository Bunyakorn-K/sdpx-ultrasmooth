import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "#/db/client";
import { classroomMembers, groupEntities, users } from "#/db/schema";
import { notFound, unauthorized } from "#/lib/api-error";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId: classroomIdParam } = await params;
  const classroomId = Number(classroomIdParam);

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const role = await getClassroomRole(classroomId, user.id);
  if (role !== "INSTRUCTOR") return notFound("Classroom not found.");

  const roster = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      email: users.emailRaw,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
      groupName: groupEntities.name,
    })
    .from(classroomMembers)
    .innerJoin(users, eq(classroomMembers.userId, users.id))
    .leftJoin(groupEntities, eq(classroomMembers.groupId, groupEntities.id))
    .where(and(eq(classroomMembers.classroomId, classroomId), eq(classroomMembers.role, "STUDENT")));

  return NextResponse.json({ roster });
}
