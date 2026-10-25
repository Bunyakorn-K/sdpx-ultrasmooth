import { pairPreviewResponse } from "@/features/assignments/server/http-handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return pairPreviewResponse(request, (await context.params).id);
}
