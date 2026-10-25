import {
  listAssignmentsResponse,
  assignmentCommandResponse,
} from "@/features/assignments/server/http-handlers";

export const GET = listAssignmentsResponse;
export async function POST(request: Request) {
  return assignmentCommandResponse(request);
}
