import { NextResponse } from "next/server";

import { apiError, unauthorized } from "#/lib/api-error";
import { getCurrentUser } from "#/lib/auth";
import { createStandaloneAssignment, listMyAssignments } from "#/services/assignment-service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const rows = await listMyAssignments(user.id);
  // Only the teacher hands out the join code.
  return NextResponse.json({
    assignments: rows.map(({ joinCode, ...row }) => (row.role === "INSTRUCTOR" ? { ...row, joinCode } : row)),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "teacher") return apiError(403, "TEACHER_ONLY", "Only teachers create assignments.");

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 200) return apiError(400, "INVALID_BODY", "name is required (1-200 characters).");
  const deadlineUtc = typeof body?.deadlineUtc === "string" && !Number.isNaN(Date.parse(body.deadlineUtc)) ? body.deadlineUtc : null;

  const assignment = await createStandaloneAssignment(user.id, { name, deadlineUtc });
  return NextResponse.json(assignment, { status: 201 });
}
