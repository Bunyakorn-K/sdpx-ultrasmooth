import { apiError, notFound, unauthorized } from "#/lib/api-error";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { endVoting, getAssignment } from "#/services/assignment-service";

// Ends voting early. Scores already given are kept; new ones are rejected.
export async function POST(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { assignmentId: raw } = await params;
  const assignmentId = Number(raw);
  if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) return notFound();

  const assignment = await getAssignment(assignmentId);
  if (!assignment) return notFound("Assignment not found.");
  if (user.role !== "teacher" || await getClassroomRole(assignment.classroomId, user.id) !== "INSTRUCTOR") {
    return notFound("Assignment not found.");
  }

  if (!await endVoting(assignmentId)) return apiError(409, "VOTING_NOT_OPEN", "Voting is not open.");
  return new Response(null, { status: 204 });
}
