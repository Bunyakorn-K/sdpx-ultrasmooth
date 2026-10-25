import { cleanupTestRun } from "@/features/testing/server/test-data-service";
import { readJsonObject, withApi } from "@/shared/server/http";
import { requireTestEnvironment } from "@/shared/server/test-environment";

export const POST = withApi("/api/test/cleanup", async (request) => {
  requireTestEnvironment(request);
  const input = await readJsonObject(request);
  await cleanupTestRun(String(input.runId || ""), input.additionalUserIds);
  return Response.json({ ok: true });
});
