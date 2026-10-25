import { assignmentDetailResponse } from "@/features/assignments/server/http-handlers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return assignmentDetailResponse(request, (await context.params).id);
}
