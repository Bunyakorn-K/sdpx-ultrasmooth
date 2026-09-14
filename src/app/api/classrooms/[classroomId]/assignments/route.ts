import { NextResponse } from "next/server";

import { apiError, notFound, unauthorized } from "#/lib/api-error";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { createAssignment, listAssignments } from "#/services/assignment-service";

export async function GET(_request: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId: classroomIdParam } = await params;
  const classroomId = Number(classroomIdParam);

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const role = await getClassroomRole(classroomId, user.id);
  if (!role) return notFound("Classroom not found.");

  const assignments = await listAssignments(classroomId);
  return NextResponse.json({ assignments });
}

export async function POST(request: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId: classroomIdParam } = await params;
  const classroomId = Number(classroomIdParam);

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const role = await getClassroomRole(classroomId, user.id);
  if (role !== "INSTRUCTOR") return notFound("Classroom not found.");

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return apiError(400, "INVALID_BODY", "name is required.");
  }

  const groupMaxScore = typeof body?.groupMaxScore === "number" ? body.groupMaxScore : undefined;
  const deadlineUtc = typeof body?.deadlineUtc === "string" ? body.deadlineUtc : null;

  const assignment = await createAssignment(classroomId, user.id, { name, groupMaxScore, deadlineUtc });
  return NextResponse.json(assignment, { status: 201 });
}
