import { clearRecords, isTestDataApiEnabled } from "#/lib/test-data";

export async function POST() {
  if (!isTestDataApiEnabled()) {
    return new Response(null, { status: 404 });
  }

  clearRecords();
  return Response.json({ cleared: true });
}
