import { linkAssignmentResponse } from "@/features/classroom/server/http-handlers";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  return linkAssignmentResponse(request, id);
}
