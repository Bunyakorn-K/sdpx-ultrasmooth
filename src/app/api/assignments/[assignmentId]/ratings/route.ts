import { apiError, notFound, unauthorized } from "#/lib/api-error";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { getAssignment } from "#/services/assignment-service";
import { getOwnGroupId, getVotingSheet, saveRating } from "#/services/rating-service";
import { canRate } from "#/services/voting-rules";
import { withRequestLogging } from "#/middleware/logging";

type Context = { params: Promise<{ assignmentId: string }> };

async function studentAccess(context: Context) {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  const { assignmentId } = await context.params;
  if (!Number.isSafeInteger(Number(assignmentId)) || Number(assignmentId) <= 0) return { response: notFound() };
  const assignment = await getAssignment(Number(assignmentId));
  if (!assignment) return { response: notFound() };
  const role = await getClassroomRole(assignment.classroomId, user.id);
  if (role !== "STUDENT" || user.role !== "student") return { response: notFound() };
  return { user, assignment, role };
}

export const GET = withRequestLogging("/api/assignments/:assignmentId/ratings", async (_request: Request, context: Context) => {
  const result = await studentAccess(context);
  if (result.response) return result.response;
  if (result.assignment.status !== "PUBLISHED") return notFound();
  return Response.json(await getVotingSheet(result.assignment.id, result.user.id));
});

// One score per call, keyed by question and group, so the page can save as the student clicks.
export const PUT = withRequestLogging("/api/assignments/:assignmentId/ratings", async (request: Request, context: Context) => {
  const result = await studentAccess(context);
  if (result.response) return result.response;
  const body: unknown = await request.json().catch(() => null);
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const { questionId, groupId, score } = input;
  if (![questionId, groupId, score].every((value) => typeof value === "number" && Number.isSafeInteger(value) && value > 0)) {
    return apiError(400, "INVALID_BODY", "questionId, groupId, and score are required integers.");
  }
  const rating = { questionId: questionId as number, groupId: groupId as number, score: score as number };
  const { assignment, user, role } = result;
  if (!canRate({ ...assignment, role, ownGroupId: await getOwnGroupId(assignment.id, user.id),
    targetGroupId: rating.groupId, score: rating.score })) {
    return apiError(403, "VOTING_CLOSED", "Voting is closed, the score is outside 1-5, or this is your own group.");
  }
  if (!await saveRating(assignment.id, user.id, rating)) return notFound("Question or group not found.");
  return Response.json(rating);
});
