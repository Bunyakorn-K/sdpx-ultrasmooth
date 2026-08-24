import { isTestDataApiEnabled, seedRecords, type SeedRecord } from "#/lib/test-data";

// Accepts either a bare JSON array of records or { records: [...] }.
export async function POST(request: Request) {
  if (!isTestDataApiEnabled()) {
    return new Response(null, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const container: unknown = Array.isArray(body)
    ? body
    : (body as { records?: unknown } | null)?.records;
  if (!Array.isArray(container)) {
    return Response.json(
      { error: 'Expected a JSON array or an object with a "records" array' },
      { status: 400 },
    );
  }

  const result = seedRecords(container as SeedRecord[]);
  return Response.json(result);
}
