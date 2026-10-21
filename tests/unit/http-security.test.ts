import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "@/shared/domain/app-error";
import {
  readJsonObject,
  requireSameOrigin,
  requireResourceId,
  errorResponse,
  withApi,
} from "@/shared/server/http";
test("SEC01: malformed JSON, arrays and null produce 400 instead of server failure", async () => {
  for (const body of ["{", "[]", "null", "42"])
    await assert.rejects(
      () =>
        readJsonObject(
          new Request("http://localhost/api", { method: "POST", body }),
        ),
      AppError,
    );
});
test("SEC01: oversized request bodies are rejected", async () => {
  await assert.rejects(
    () =>
      readJsonObject(
        new Request("http://localhost/api", {
          method: "POST",
          body: JSON.stringify({ text: "x".repeat(131073) }),
        }),
      ),
    (error) => error instanceof AppError && error.status === 413,
  );
});
test("SEC02: cross-origin mutations are denied", () => {
  assert.throws(() =>
    requireSameOrigin(
      new Request("http://localhost/api", {
        headers: { origin: "https://attacker.invalid" },
      }),
    ),
  );
  requireSameOrigin(
    new Request("http://localhost/api", {
      headers: { origin: "http://localhost" },
    }),
  );
});
test("SEC03: malformed resource identifiers are rejected before database queries", () => {
  assert.throws(() => requireResourceId("' OR 1=1--"));
  assert.equal(
    requireResourceId("0a814831-82de-4b48-bd93-600e9e27bd3d"),
    "0a814831-82de-4b48-bd93-600e9e27bd3d",
  );
});
test("SEC04: database exceptions never expose connection strings or stack traces", async () => {
  const response = errorResponse(
    new Error("postgresql://secret-user:secret-password@private.invalid/db"),
  );
  const text = await response.text();
  assert.equal(response.status, 503);
  assert.doesNotMatch(
    text,
    /secret-user|secret-password|stack|private.invalid/,
  );
});
test("SEC05: API errors include stable codes and request correlation without accepting arbitrary header values", async () => {
  const handler = withApi("/api/example/:id", async () => {
    throw new AppError("Denied", 403);
  });
  const response = await handler(
    new Request("http://localhost/api/example/a", {
      headers: { "x-request-id": "sensitive-token-value" },
    }),
  );
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "FORBIDDEN");
  assert.match(response.headers.get("x-request-id") || "", /^[0-9a-f-]{36}$/);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("SEC02: legitimate browser Origin matches the request Host behind Next internal URL normalization", () => {
  requireSameOrigin(
    new Request("http://localhost:3100/api", {
      headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
    }),
  );
});

test("SEC02: proxy headers x-forwarded-proto and x-forwarded-host are respected", () => {
  requireSameOrigin(
    new Request("http://localhost:3000/api", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "sdpx-ultrasmooth.vercel.app",
        origin: "https://sdpx-ultrasmooth.vercel.app",
      },
    }),
  );

  requireSameOrigin(
    new Request("http://localhost:3000/api", {
      headers: {
        "x-forwarded-proto": "https, http",
        host: "sdpx-ultrasmooth.vercel.app",
        origin: "https://sdpx-ultrasmooth.vercel.app",
      },
    }),
  );

  assert.throws(
    () =>
      requireSameOrigin(
        new Request("http://localhost:3000/api", {
          headers: {
            "x-forwarded-proto": "https",
            "x-forwarded-host": "sdpx-ultrasmooth.vercel.app",
            origin: "https://attacker.invalid",
          },
        }),
      ),
    AppError,
  );
});
