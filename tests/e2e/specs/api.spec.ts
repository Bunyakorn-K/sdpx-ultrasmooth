import type { APIRequestContext, PlaywrightWorkerArgs } from "@playwright/test";
import type { Assignment } from "@/features/assignments/types";
import { test, expect } from "../fixtures";
import type { SeedAccount } from "../seed/test-data";
async function actor(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string,
  account: SeedAccount,
) {
  const context = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: new URL(baseURL).origin },
  });
  const login = await context.post("/api/auth/login", {
    data: { email: account.email, password: account.password },
  });
  expect(login.status()).toBe(200);
  return context;
}
async function createAssignment(context: APIRequestContext) {
  const response = await context.post("/api/assignments", {
    data: {
      title: "API evaluation",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      questions: ["Content", "Delivery"],
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).assignment as Assignment;
}
test.describe("Database-backed authenticated journeys", () => {
  test.skip(
    process.env.E2E_DATABASE_ENABLED !== "1",
    "Requires an isolated *_test PostgreSQL database.",
  );
  // US01 AC2/AC3: a real student signs in through the MUI form and leaves via logout.
  test("US01: browser login and logout use the database session", async ({
    page,
    users,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "เข้าสู่ระบบ", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel("อีเมล").fill(users.student.email);
    await page
      .getByLabel("รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)")
      .fill(users.student.password);
    await page
      .getByRole("button", { name: "เข้าสู่ระบบ", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "ห้องเรียนของฉัน (Classrooms)" }),
    ).toBeVisible();
    await expect(
      page.getByText(users.student.name, { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
    await expect(page.getByTestId("main-cta")).toBeVisible();
  });
  // US01 AC1/AC2/AC3: server session is issued, does not leak hashes, and is revoked.
  test("US01: real registration, login, session and logout", async ({
    playwright,
    baseURL,
    users,
  }) => {
    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { origin: new URL(baseURL!).origin },
    });
    try {
      const email = `new-${users.runId}@e2e.invalid`;
      const registered = await context.post("/api/auth/register", {
        data: {
          name: "New Student",
          email,
          password: users.student.password,
          role: "student",
        },
      });
      expect(registered.status()).toBe(201);
      const data = await registered.json();
      users.createdUserIds.push(data.user.id);
      expect(data.user.password_hash).toBeUndefined();
      expect((await context.get("/api/auth")).status()).toBe(200);
      expect((await (await context.get("/api/auth")).json()).user.email).toBe(
        email,
      );
      const cookie = (await context.storageState()).cookies.find(
        (cookie) => cookie.name === "pair_session",
      );
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.sameSite).toBe("Lax");
      await context.post("/api/auth/logout", { data: {} });
      expect((await context.get("/api/assignments")).status()).toBe(401);
    } finally {
      await context.dispose();
    }
  });
  // US02-US08: real persistence, authorization, score validation and duplicate protection.
  test("US02-US08: authenticated groups, votes, ownership and results use PostgreSQL", async ({
    playwright,
    baseURL,
    users,
  }) => {
    const teacher = await actor(playwright, baseURL!, users.teacher);
    const student = await actor(playwright, baseURL!, users.student);
    const other = await actor(playwright, baseURL!, users.other);
    try {
      const assignment = await createAssignment(teacher);
      const root = `/api/assignments/${assignment.id}`;
      expect((await other.get(root)).status()).toBe(403);
      for (const [context, name] of [
        [student, "One"],
        [other, "Two"],
      ] as const) {
        expect(
          (
            await context.post("/api/assignments/join", {
              data: { code: assignment.code },
            })
          ).status(),
        ).toBe(200);
        expect(
          (await context.post(`${root}/groups`, { data: { name } })).status(),
        ).toBe(201);
      }
      expect(
        (await student.post(`${root}/voting/start`, { data: {} })).status(),
      ).toBe(403);
      expect(
        (await teacher.post(`${root}/voting/start`, { data: {} })).status(),
      ).toBe(200);
      const current = (await (await teacher.get(root)).json())
        .assignment as Assignment;
      const own = current.groups.find((group) => group.name === "One")!;
      const target = current.groups.find((group) => group.name === "Two")!;
      expect(
        (
          await student.post(`${root}/votes`, {
            data: { groupId: own.id, scores: [5, 5] },
          })
        ).status(),
      ).toBe(400);
      expect(
        (
          await student.post(`${root}/votes`, {
            data: { groupId: target.id, scores: [7, 5] },
          })
        ).status(),
      ).toBe(400);
      const submissions = await Promise.all(
        [1, 2].map(() =>
          student.post(`${root}/votes`, {
            data: { groupId: target.id, scores: [6, 5] },
          }),
        ),
      );
      expect(submissions.map((response) => response.status()).sort()).toEqual([
        201, 409,
      ]);
      expect((await (await other.get(root)).json()).assignment.votes).toEqual(
        [],
      );
      expect(
        (await teacher.post(`${root}/voting/stop`, { data: {} })).status(),
      ).toBe(200);
      expect(
        (
          await student.post(`${root}/votes`, {
            data: { groupId: target.id, scores: [5, 5] },
          })
        ).status(),
      ).toBe(400);
      const result = (await (await teacher.get(root)).json())
        .assignment as Assignment;
      expect(result.votes).toHaveLength(1);
      expect(result.votes[0].scores).toEqual([6, 5]);
    } finally {
      await Promise.all([
        teacher.dispose(),
        student.dispose(),
        other.dispose(),
      ]);
    }
  });
  // SEC07: rate limiting is enforced against persistent shared storage.
  test("SEC07: repeated failed logins are limited without exposing database errors", async ({
    request,
    baseURL,
    users,
  }) => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 11; attempt++) {
      const response = await request.post("/api/auth/login", {
        headers: { origin: new URL(baseURL!).origin },
        data: { email: users.student.email, password: "wrong-password" },
      });
      statuses.push(response.status());
    }
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
    expect(statuses[10]).toBe(429);
  });
});
