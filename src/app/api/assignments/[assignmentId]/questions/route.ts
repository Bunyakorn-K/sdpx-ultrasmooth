import { apiError, notFound, unauthorized } from "#/lib/api-error";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { getAssignment } from "#/services/assignment-service";
import { GroupRuleError } from "#/services/group-rules";
import { addQuestion, deleteQuestion, listQuestions } from "#/services/question-service";
import { withRequestLogging } from "#/middleware/logging";

type Context = { params: Promise<{ assignmentId: string }> };

async function access(context: Context, instructorOnly: boolean) {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  const { assignmentId } = await context.params;
  if (!Number.isSafeInteger(Number(assignmentId)) || Number(assignmentId) <= 0) return { response: notFound() };
  const assignment = await getAssignment(Number(assignmentId));
  if (!assignment) return { response: notFound() };
  const role = await getClassroomRole(assignment.classroomId, user.id);
  if (!role || (instructorOnly && (role !== "INSTRUCTOR" || user.role !== "teacher"))) return { response: notFound() };
  return { assignment };
}

function ruleError(error: unknown) {
  if (error instanceof GroupRuleError) return apiError(error.status, "QUESTION_RULE", error.message);
  return apiError(500, "QUESTION_FAILED", "Could not save the question.");
}

export const GET = withRequestLogging("/api/assignments/:assignmentId/questions", async (_request: Request, context: Context) => {
  const result = await access(context, false);
  if (result.response) return result.response;
  return Response.json({ questions: await listQuestions(result.assignment.id) });
});

export const POST = withRequestLogging("/api/assignments/:assignmentId/questions", async (request: Request, context: Context) => {
  const result = await access(context, true);
  if (result.response) return result.response;
  const body: unknown = await request.json().catch(() => null);
  try {
    return Response.json(await addQuestion(result.assignment.id, body), { status: 201 });
  } catch (error) {
    return ruleError(error);
  }
});

export const DELETE = withRequestLogging("/api/assignments/:assignmentId/questions", async (request: Request, context: Context) => {
  const result = await access(context, true);
  if (result.response) return result.response;
  const body: unknown = await request.json().catch(() => null);
  const questionId = body && typeof body === "object" && "questionId" in body ? body.questionId : null;
  if (typeof questionId !== "number" || !Number.isSafeInteger(questionId) || questionId <= 0) {
    return apiError(400, "INVALID_QUESTION", "A valid question ID is required.");
  }
  try {
    await deleteQuestion(result.assignment.id, questionId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return ruleError(error);
  }
});
