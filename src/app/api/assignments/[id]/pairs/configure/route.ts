import { assignmentCommandResponse } from "@/features/assignments/server/http-handlers";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return assignmentCommandResponse(
    request,
    "configurePairs",
    (await context.params).id,
  );
}
