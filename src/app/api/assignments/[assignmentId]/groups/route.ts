import { apiError, notFound, unauthorized } from "#/lib/api-error";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { getAssignment } from "#/services/assignment-service";
import { deleteAssignmentGroup, enrollGroup, listAssignmentGroups } from "#/services/group-service";
import { GroupRuleError } from "#/services/group-rules";
import { withRequestLogging } from "#/middleware/logging";

type Context = { params: Promise<{ assignmentId: string }> };

async function access(context: Context) {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  const { assignmentId } = await context.params;
  if (!Number.isSafeInteger(Number(assignmentId)) || Number(assignmentId) <= 0) return { response: notFound() };
  const assignment = await getAssignment(Number(assignmentId));
  if (!assignment) return { response: notFound() };
  const role = await getClassroomRole(assignment.classroomId, user.id);
  if (!role) return { response: notFound() };
  if (role === "STUDENT" && user.role !== "student") return { response: notFound() };
  return { user, assignment, role };
}

async function getGroups(_request: Request, context: Context) {
  const result = await access(context);
  if (result.response) return result.response;
  return Response.json(await listAssignmentGroups(result.assignment.id, result.user.id, result.role === "INSTRUCTOR"));
}

async function postGroup(request: Request, context: Context) {
  const result = await access(context);
  if (result.response) return result.response;
  const body: unknown = await request.json().catch(() => null);
  try {
    const group = await enrollGroup(result.assignment.id, result.user.id, result.role === "INSTRUCTOR", body);
    return Response.json(group, { status: 201 });
  } catch (error) {
    if (error instanceof GroupRuleError) return apiError(error.status, "GROUP_RULE", error.message);
    return apiError(500, "GROUP_FAILED", "Could not save the group.");
  }
}

export const GET = withRequestLogging("/api/assignments/:assignmentId/groups", getGroups);
export const POST = withRequestLogging("/api/assignments/:assignmentId/groups", postGroup);

export const DELETE = withRequestLogging("/api/assignments/:assignmentId/groups", async (request: Request, context: Context) => {
  const result = await access(context);
  if (result.response) return result.response;
  if (result.user.role !== "teacher" || result.role !== "INSTRUCTOR") return notFound();
  const body: unknown = await request.json().catch(() => null);
  const groupId = body && typeof body === "object" && "groupId" in body ? body.groupId : null;
  if (typeof groupId !== "number" || !Number.isSafeInteger(groupId) || groupId <= 0) return apiError(400, "INVALID_GROUP", "A valid group ID is required.");
  try {
    await deleteAssignmentGroup(result.assignment.id, groupId);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof GroupRuleError) return apiError(error.status, "GROUP_RULE", error.message);
    return apiError(409, "GROUP_DELETE_FAILED", "Could not delete the group. Refresh and try again.");
  }
});
