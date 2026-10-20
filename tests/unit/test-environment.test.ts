import test from "node:test";
import assert from "node:assert/strict";
import { requireTestEnvironment } from "@/shared/server/test-environment";
const token = "test-only-not-a-real-secret-1234567890";
const request = new Request("http://localhost/api/test/seed", {
  headers: { "x-test-token": token },
});
const environment = {
  NODE_ENV: "test",
  E2E_TEST_MODE: "1",
  E2E_SEED_TOKEN: token,
  DATABASE_DRIVER: "postgres",
  DATABASE_URL: "postgresql://localhost/peerly_test",
};
test("SEC06: seed and cleanup are always disabled in production, even with a correct token", () => {
  assert.throws(() =>
    requireTestEnvironment(request, { ...environment, NODE_ENV: "production" }),
  );
});
test("SEC06: test support requires explicit opt-in, test database, TCP driver and a matching token", () => {
  requireTestEnvironment(request, environment);
  for (const override of [
    { E2E_TEST_MODE: "0" },
    { DATABASE_URL: "postgresql://localhost/peerly" },
    { DATABASE_URL: "invalid" },
    { DATABASE_DRIVER: "neon" },
    { E2E_SEED_TOKEN: "" },
  ])
    assert.throws(() =>
      requireTestEnvironment(request, { ...environment, ...override }),
    );
  assert.throws(() =>
    requireTestEnvironment(new Request(request.url), environment),
  );
});
