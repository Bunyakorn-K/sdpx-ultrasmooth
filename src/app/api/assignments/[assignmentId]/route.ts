import { NextResponse } from "next/server";

import { apiError, notFound, unauthorized } from "#/lib/api-error";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { AssignmentNotDraftError, getAssignment, updateAssignment } from "#/services/assignment-service";

export async function GET(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId: assignmentIdParam } = await params;
  const assignmentId = Number(assignmentIdParam);

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const assignment = await getAssignment(assignmentId);
  if (!assignment) return notFound("Assignment not found.");

  const role = await getClassroomRole(assignment.classroomId, user.id);
  if (!role) return notFound("Assignment not found.");

  return NextResponse.json(assignment);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId: assignmentIdParam } = await params;
  const assignmentId = Number(assignmentIdParam);

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const assignment = await getAssignment(assignmentId);
  if (!assignment) return notFound("Assignment not found.");

  const role = await getClassroomRole(assignment.classroomId, user.id);
  if (role !== "INSTRUCTOR") return notFound("Assignment not found.");

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const groupMaxScore = typeof body?.groupMaxScore === "number" ? body.groupMaxScore : undefined;
  const deadlineUtc =
    body && "deadlineUtc" in body ? (typeof body.deadlineUtc === "string" ? body.deadlineUtc : null) : undefined;

  try {
    const updated = await updateAssignment(assignmentId, { name, groupMaxScore, deadlineUtc });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AssignmentNotDraftError) {
      return apiError(409, "NOT_DRAFT", error.message);
    }
    throw error;
  }
}
