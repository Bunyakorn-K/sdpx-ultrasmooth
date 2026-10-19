import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { apiError, notFound, unauthorized } from "#/lib/api-error";
import { deleteClassroom } from "#/services/delete-classroom-service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { classroomId: raw } = await params;
  const classroomId = Number(raw);
  if (!Number.isSafeInteger(classroomId) || classroomId <= 0) return notFound();
  if (user.role !== "teacher" || await getClassroomRole(classroomId, user.id) !== "INSTRUCTOR") return notFound();
  try {
    if (!await deleteClassroom(classroomId, user.id)) return notFound();
    return new Response(null, { status: 204 });
  } catch {
    return apiError(409, "CLASSROOM_DELETE_FAILED", "Could not delete the classroom. Refresh and try again.");
  }
}
