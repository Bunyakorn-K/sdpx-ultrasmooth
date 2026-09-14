import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "#/db/client";
import { classroomMembers, classrooms } from "#/db/schema";
import { apiError, unauthorized } from "#/lib/api-error";
import { getCurrentUser } from "#/lib/auth";
import { uniqueSlug } from "#/lib/slug";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const rows = await db
    .select({ id: classrooms.id, name: classrooms.name, slug: classrooms.slug, role: classroomMembers.role })
    .from(classroomMembers)
    .innerJoin(classrooms, eq(classroomMembers.classroomId, classrooms.id))
    .where(eq(classroomMembers.userId, user.id));

  return NextResponse.json({ classrooms: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return apiError(400, "INVALID_BODY", "name is required.");
  }

  const [classroom] = await db
    .insert(classrooms)
    .values({ name, slug: uniqueSlug(name), createdBy: user.id })
    .returning();

  await db.insert(classroomMembers).values({ classroomId: classroom.id, userId: user.id, role: "INSTRUCTOR" });

  return NextResponse.json({ id: classroom.id, name: classroom.name, slug: classroom.slug }, { status: 201 });
}
