import { eq } from "drizzle-orm";
import { db } from "#/db/client";
import { classroomMembers, classrooms } from "#/db/schema";
import { getCurrentUser } from "#/lib/auth";
import { apiError, notFound, unauthorized } from "#/lib/api-error";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "student") return apiError(403, "STUDENT_ONLY", "Only students join classrooms.");
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code || code.length > 150) return apiError(400, "INVALID_CODE", "Enter a classroom invitation code.");
  const [classroom] = await db.select().from(classrooms).where(eq(classrooms.slug, code));
  if (!classroom) return notFound("Classroom not found.");
  await db.insert(classroomMembers).values({ classroomId: classroom.id, userId: user.id, role: "STUDENT" }).onConflictDoNothing();
  return Response.json({ classroomId: classroom.id }, { status: 201 });
}
