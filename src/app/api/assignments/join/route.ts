import { assignmentCommandResponse } from "@/features/assignments/server/http-handlers";
export async function POST(request: Request) {
  return assignmentCommandResponse(
    request,
    "join",
    undefined,
    "/api/assignments/join",
  );
}
