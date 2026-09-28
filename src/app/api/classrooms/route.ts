import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { db } from "#/db/client";
import { classroomMembers, classrooms } from "#/db/schema";
import { apiError, unauthorized } from "#/lib/api-error";
import { getCurrentUser } from "#/lib/auth";
import { uniqueSlug } from "#/lib/slug";
import { logger } from "#/lib/logger";

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
  // เริ่มจับเวลาและดึง / สร้าง Request ID
  const start = Date.now();
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  
  const user = await getCurrentUser();
  if (!user) {
    logger.error({
      event: "classroom_creation_failed",
      requestId,
      reason: "UNAUTHORIZED",
    });
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    logger.error({
      event: "classroom_creation_failed",
      requestId,
      reason: "INVALID_BODY",
      userId: user.id,
    });
    return apiError(400, "INVALID_BODY", "name is required.");
  }

  try {
    const [classroom] = await db
      .insert(classrooms)
      .values({ name, slug: uniqueSlug(name), createdBy: user.id })
      .returning();

    await db.insert(classroomMembers).values({ classroomId: classroom.id, userId: user.id, role: "INSTRUCTOR" });

    // 🚀 ยิง Log ว่าสร้าง Classroom สำเร็จ!
    logger.info({
      event: "classroom_created",
      requestId,
      classroomId: classroom.id,
      userId: user.id,
      duration_ms: Date.now() - start,
    });

    return NextResponse.json({ id: classroom.id, name: classroom.name, slug: classroom.slug }, { status: 201 });
  } catch (error: any) {
    // ❌ ยิง Log กรณีพัง (เช่น เกิดปัญหากับ Database)
    logger.error({
      event: "classroom_creation_failed",
      requestId,
      reason: error.code || "UNKNOWN_ERROR",
      userId: user.id,
      duration_ms: Date.now() - start,
    });
    throw error;
  }
}