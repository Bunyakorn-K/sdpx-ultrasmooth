import { test as base, expect } from "@playwright/test";
import { makeTestUsers, type TestUsers } from "../seed/test-data";
type TestFixtures = { users: TestUsers; cleanDb: void };
export const test = base.extend<TestFixtures>({
  users: async ({}, use) => {
    await use(makeTestUsers());
  },
  cleanDb: [
    async ({ request, users }, use) => {
      if (process.env.E2E_DATABASE_ENABLED !== "1") {
        await use();
        return;
      }
      const headers = { "x-test-token": process.env.E2E_SEED_TOKEN || "" };
      const seeded = await request.post("/api/test/seed", {
        headers,
        data: {
          runId: users.runId,
          users: [users.teacher, users.student, users.other],
        },
      });
      expect(seeded.status(), "isolated test data must seed successfully").toBe(
        201,
      );
      try {
        await use();
      } finally {
        const cleaned = await request.post("/api/test/cleanup", {
          headers,
          data: { runId: users.runId, additionalUserIds: users.createdUserIds },
        });
        expect(
          cleaned.ok(),
          "cleanup must succeed even after test failure",
        ).toBeTruthy();
      }
    },
    { auto: true },
  ],
});
export { expect };
