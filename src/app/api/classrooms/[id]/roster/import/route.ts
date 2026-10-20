import { importRosterResponse } from "@/features/classroom/server/http-handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return importRosterResponse(request, id);
}
