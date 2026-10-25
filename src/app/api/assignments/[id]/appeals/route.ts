import { assignmentCommandResponse } from "@/features/assignments/server/http-handlers";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return assignmentCommandResponse(
    request,
    "resolveAppeal",
    (await context.params).id,
    "/api/assignments/:id/appeals",
  );
}
