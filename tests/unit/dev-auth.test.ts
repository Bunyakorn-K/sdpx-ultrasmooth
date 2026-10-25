import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "@/app/api/dev/users/route";

test("SEC: /api/dev/users returns 404 in production environment", async () => {
  const env = process.env as Record<string, string | undefined>;
  const origEnv = env.NODE_ENV;
  try {
    env.NODE_ENV = "production";
    const getRes = await GET();
    assert.equal(getRes.status, 404);

    const postRes = await POST(
      new Request("http://localhost/api/dev/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quick-create" }),
      }),
    );
    assert.equal(postRes.status, 404);
  } finally {
    env.NODE_ENV = origEnv;
  }
});

test("DEV: /api/dev/users rejects unknown action with 400", async () => {
  const env = process.env as Record<string, string | undefined>;
  const origEnv = env.NODE_ENV;
  try {
    env.NODE_ENV = "development";
    const postRes = await POST(
      new Request("http://localhost/api/dev/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unknown-action" }),
      }),
    );
    assert.equal(postRes.status, 400);
  } finally {
    env.NODE_ENV = origEnv;
  }
});
