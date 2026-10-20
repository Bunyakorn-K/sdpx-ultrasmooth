import { archiveClassroomResponse } from "@/features/classroom/server/http-handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return archiveClassroomResponse(request, id);
}
