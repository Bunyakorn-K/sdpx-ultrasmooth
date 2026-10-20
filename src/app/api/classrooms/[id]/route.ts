import { classroomDetailResponse } from "@/features/classroom/server/http-handlers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return classroomDetailResponse(request, id);
}
