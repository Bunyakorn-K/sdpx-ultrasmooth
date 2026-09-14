import { NextResponse } from "next/server";

import { apiError, notFound, unauthorized } from "#/lib/api-error";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { AssignmentNotDraftError, getAssignment, publishAssignment } from "#/services/assignment-service";

export async function POST(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId: assignmentIdParam } = await params;
  const assignmentId = Number(assignmentIdParam);

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const assignment = await getAssignment(assignmentId);
  if (!assignment) return notFound("Assignment not found.");

  const role = await getClassroomRole(assignment.classroomId, user.id);
  if (role !== "INSTRUCTOR") return notFound("Assignment not found.");

  try {
    const result = await publishAssignment(assignmentId);
    if (!result.published) {
      return apiError(422, "INFEASIBLE", result.feasibility.message, result.feasibility);
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AssignmentNotDraftError) {
      return apiError(409, "NOT_DRAFT", error.message);
    }
    throw error;
  }
}
