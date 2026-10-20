import { assignmentCommandResponse } from "@/features/assignments/server/http-handlers";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return assignmentCommandResponse(
    request,
    "joinGroup",
    (await context.params).id,
    "/api/assignments/:id/groups/join",
  );
}
