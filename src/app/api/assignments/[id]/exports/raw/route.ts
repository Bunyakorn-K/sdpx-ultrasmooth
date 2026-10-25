import { rawExportResponse } from "@/features/assignments/server/raw-export-handler";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return rawExportResponse(request, (await context.params).id);
}
