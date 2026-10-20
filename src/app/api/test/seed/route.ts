import { seedTestRun } from "@/features/testing/server/test-data-service";
import { readJsonObject, withApi } from "@/shared/server/http";
import { requireTestEnvironment } from "@/shared/server/test-environment";
export const POST = withApi("/api/test/seed", async (request) => {
  requireTestEnvironment(request);
  return Response.json(await seedTestRun(await readJsonObject(request)), {
    status: 201,
  });
});
