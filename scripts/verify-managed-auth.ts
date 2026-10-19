import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";

async function verify() {
  const baseURL = process.env.AUTH_TEST_BASE_URL ?? "http://127.0.0.1:3000";
  const email = process.env.AUTH_TEST_EMAIL ?? `paireval-test-${randomUUID()}@example.com`;
  const password = randomBytes(32).toString("base64url");
  const browser = await chromium.launch();
  // No screenshots, traces, storage state, or credentials are written to disk.
  const context = await browser.newContext({ baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/sign-up");
    await page.getByLabel("Name", { exact: true }).fill("PairEval synthetic test user");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    const button = page.getByRole("button", { name: "Create account", exact: true });
    assert.ok(await button.isEnabled(), "Managed Auth must be configured before verification.");
    await button.click();
    await page.waitForURL("**/classrooms", { timeout: 20_000 });
    const session = await context.request.get("/api/auth/get-session");
    const identity = await session.json();
    assert.equal(identity.user?.email, email);
    const account = await context.request.get("/api/account");
    assert.equal(account.status(), 200);
    assert.equal((await account.json()).user.role, "student");
    assert.equal((await context.request.post("/api/classrooms", { data: { name: "Forbidden" } })).status(), 403);
    await page.reload();
    assert.equal((await context.request.get("/api/account")).status(), 200);
    assert.equal((await context.request.post("/api/auth/sign-out")).status(), 200);
    assert.equal((await context.request.get("/api/account")).status(), 401);
    await page.goto("/sign-in");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/classrooms", { timeout: 20_000 });
    assert.equal((await context.request.get("/api/account")).status(), 200);
    await context.request.post("/api/auth/sign-out");
    console.log(JSON.stringify({ signup: "passed", currentUserReadBack: "matched", role: "student",
      teacherBoundary: "passed", reload: "passed", signOut: "passed", signIn: "passed", secretsPrinted: false }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

verify().catch(() => {
  console.error("Managed Auth verification could not complete. Check branch configuration, email verification, and runtime environment. No credentials or user details logged.");
  process.exitCode = 1;
});
