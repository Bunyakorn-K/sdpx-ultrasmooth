import { assignmentCommandResponse } from "@/features/assignments/server/http-handlers";

export function POST(request: Request) {
  return assignmentCommandResponse(
    request,
    "submitAppeal",
    undefined,
    "/api/appeals",
  );
}
