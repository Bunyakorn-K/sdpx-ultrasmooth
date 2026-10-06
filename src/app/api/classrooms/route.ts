import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "#/db/client";
import { classroomMembers, classrooms } from "#/db/schema";
import { apiError, unauthorized } from "#/lib/api-error";
import { getCurrentUser } from "#/lib/auth";
import { uniqueSlug } from "#/lib/slug";
import { logger } from "#/lib/logger";
import { getRequestId, logRequest } from "#/middleware/logging";

export async function GET(request: Request) {
  const start = Date.now();
  const requestId = getRequestId(request);
  const user = await getCurrentUser();
  if (!user) {
    logRequest({ requestId, method: "GET", path: "/api/classrooms", statusCode: 401, durationMs: Date.now() - start });
    const response = unauthorized();
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const rows = await db
    .select({ id: classrooms.id, name: classrooms.name, slug: classrooms.slug, role: classroomMembers.role })
    .from(classroomMembers)
    .innerJoin(classrooms, eq(classroomMembers.classroomId, classrooms.id))
    .where(eq(classroomMembers.userId, user.id));

  logRequest({ requestId, method: "GET", path: "/api/classrooms", statusCode: 200, durationMs: Date.now() - start, userId: user.id });
  return NextResponse.json({ classrooms: rows }, { headers: { "x-request-id": requestId } });
}

export async function POST(request: Request) {
  const start = Date.now();
  const requestId = getRequestId(request);
  
  const user = await getCurrentUser();
  if (!user) {
    logger.error({
      event: "classroom_creation_failed",
      requestId,
      reason: "UNAUTHORIZED",
    });
    logRequest({ requestId, method: "POST", path: "/api/classrooms", statusCode: 401, durationMs: Date.now() - start });
    const response = unauthorized();
    response.headers.set("x-request-id", requestId);
    return response;
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
    logRequest({ requestId, method: "POST", path: "/api/classrooms", statusCode: 400, durationMs: Date.now() - start, userId: user.id });
    const response = apiError(400, "INVALID_BODY", "name is required.");
    response.headers.set("x-request-id", requestId);
    return response;
  }

  try {
    const [classroom] = await db
      .insert(classrooms)
      .values({ name, slug: uniqueSlug(name), createdBy: user.id })
      .returning();

    await db.insert(classroomMembers).values({ classroomId: classroom.id, userId: user.id, role: "INSTRUCTOR" });

    logger.info({
      event: "classroom_created",
      requestId,
      classroomId: classroom.id,
      userId: user.id,
      duration_ms: Date.now() - start,
    });

    logRequest({ requestId, method: "POST", path: "/api/classrooms", statusCode: 201, durationMs: Date.now() - start, userId: user.id });
    return NextResponse.json({ id: classroom.id, name: classroom.name, slug: classroom.slug }, { status: 201, headers: { "x-request-id": requestId } });
  } catch (error: unknown) {
    logger.error({
      event: "classroom_creation_failed",
      requestId,
      reason: typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "UNKNOWN_ERROR",
      userId: user.id,
      duration_ms: Date.now() - start,
    });
    logRequest({ requestId, method: "POST", path: "/api/classrooms", statusCode: 500, durationMs: Date.now() - start, userId: user.id });
    throw error;
  }
}
