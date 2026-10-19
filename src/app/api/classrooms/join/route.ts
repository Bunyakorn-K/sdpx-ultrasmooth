import { asc, eq } from "drizzle-orm";
import { db } from "#/db/client";
import { assignments, classroomMembers, classrooms } from "#/db/schema";
import { getCurrentUser } from "#/lib/auth";
import { apiError, notFound, unauthorized } from "#/lib/api-error";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "student") return apiError(403, "STUDENT_ONLY", "Only students join assignments.");
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code || code.length > 150) return apiError(400, "INVALID_CODE", "Enter a join code.");
  const [classroom] = await db.select().from(classrooms).where(eq(classrooms.slug, code));
  if (!classroom) return notFound("No assignment uses that join code.");
  await db.insert(classroomMembers).values({ classroomId: classroom.id, userId: user.id, role: "STUDENT" }).onConflictDoNothing();
  // A join code belongs to one assignment; older classrooms may hold several, so open the first.
  const [assignment] = await db.select({ id: assignments.id }).from(assignments)
    .where(eq(assignments.classroomId, classroom.id)).orderBy(asc(assignments.id)).limit(1);
  return Response.json({ classroomId: classroom.id, assignmentId: assignment?.id ?? null }, { status: 201 });
}
