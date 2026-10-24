import type { APIRequestContext, PlaywrightWorkerArgs } from "@playwright/test";
import { test, expect } from "../fixtures";
import type { SeedAccount } from "../seed/test-data";
import { PostgresAssignmentRepository } from "@/features/assignments/server/assignment-repository";
import type {
  NotificationEvent,
  NotificationPage,
} from "@/features/notifications/types";
import { database } from "@/shared/server/database";

async function actor(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string,
  account: SeedAccount,
) {
  const context = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: new URL(baseURL).origin },
  });
  expect(
    (
      await context.post("/api/auth/login", {
        data: { email: account.email, password: account.password },
      })
    ).status(),
  ).toBe(200);
  return context;
}
async function create(api: APIRequestContext) {
  const response = await api.post("/api/assignments", {
    data: {
      title: "Notification test",
      deadline: new Date(Date.now() + 24 * 3600000).toISOString(),
      questions: ["Content"],
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).assignment as { id: string; code: string };
}

test.describe("Persisted in-app notifications", () => {
  test.skip(
    process.env.E2E_DATABASE_ENABLED !== "1",
    "Requires a guarded disposable database.",
  );
  test("lifecycle, reminder, read state, privacy and the student bell work across sessions", async ({
    playwright,
    browser,
    baseURL,
    users,
  }) => {
    const teacher = await actor(playwright, baseURL!, users.teacher);
    const student = await actor(playwright, baseURL!, users.student);
    const other = await actor(playwright, baseURL!, users.other);
    const anonymous = await playwright.request.newContext({ baseURL });
    const browserContext = await browser.newContext({
      baseURL,
      extraHTTPHeaders: { origin: new URL(baseURL!).origin },
    });
    try {
      expect((await anonymous.get("/api/notifications")).status()).toBe(401);
      expect((await teacher.get("/api/notifications")).status()).toBe(403);
      expect(
        (await student.get("/api/notifications?before=invalid")).status(),
      ).toBe(400);
      expect(
        (await (await student.get("/api/notifications")).json()).items,
      ).toEqual([]);
      const assignment = await create(teacher);
      const root = `/api/assignments/${assignment.id}`;
      for (const account of [student, other])
        expect(
          (
            await account.post("/api/assignments/join", {
              data: { code: assignment.code },
            })
          ).status(),
        ).toBe(200);
      expect(
        (
          await student.post(`${root}/groups`, { data: { name: "One" } })
        ).status(),
      ).toBe(201);
      expect(
        (
          await other.post(`${root}/groups`, { data: { name: "Two" } })
        ).status(),
      ).toBe(201);
      const starts = await Promise.all([
        teacher.post(`${root}/voting/start`, { data: {} }),
        teacher.post(`${root}/voting/start`, { data: {} }),
      ]);
      expect(starts.map((response) => response.status()).sort()).toEqual([
        200, 400,
      ]);
      const inbox = (await (
        await student.get("/api/notifications")
      ).json()) as NotificationPage;
      expect(inbox.items.map((item) => item.kind).sort()).toEqual([
        "assignment_opened",
        "deadline_reminder",
      ]);
      expect(
        (await (await student.get("/api/notifications")).json()).items,
      ).toHaveLength(2);
      for (const item of inbox.items)
        expect(Object.keys(item).sort()).toEqual([
          "assignmentId",
          "createdAt",
          "id",
          "kind",
          "readAt",
        ]);
      const foreign = (await (await other.get("/api/notifications")).json())
        .items[0];
      expect(
        (
          await student.patch(`/api/notifications/${foreign.id}/read`, {
            data: {},
          })
        ).status(),
      ).toBe(404);
      const reminder = inbox.items.find(
        (item) => item.kind === "deadline_reminder",
      )!;
      const readPath = `/api/notifications/${reminder.id}/read`;
      expect((await student.patch(readPath, { data: {} })).status()).toBe(200);
      const readAt = (
        await (await student.get("/api/notifications")).json()
      ).items.find((item: { id: string }) => item.id === reminder.id).readAt;
      expect((await student.patch(readPath, { data: {} })).status()).toBe(200);
      expect(
        (await (await student.get("/api/notifications")).json()).items.find(
          (item: { id: string }) => item.id === reminder.id,
        ).readAt,
      ).toBe(readAt);
      expect(
        (
          await browserContext.request.post("/api/auth/login", {
            data: {
              email: users.student.email,
              password: users.student.password,
            },
          })
        ).status(),
      ).toBe(200);
      const page = await browserContext.newPage();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/assignments");
      await page
        .getByRole("button", { name: "Notifications", exact: true })
        .click();
      const region = page.getByRole("region", { name: "Notification inbox" });
      await expect(
        region.getByText("An assignment is open for evaluation", {
          exact: true,
        }),
      ).toBeVisible();
      expect(
        await region.evaluate(
          (element) => element.getBoundingClientRect().right,
        ),
      ).toBeLessThanOrEqual(390);
      await page.screenshot({
        path: "test-results/notification-inbox-mobile.png",
        animations: "disabled",
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Notifications", exact: true })
        .click();
      await expect
        .poll(async () => (await region.boundingBox())?.x ?? 0)
        .toBeGreaterThan(1000);
      await page.screenshot({
        path: "test-results/notification-inbox-desktop.png",
        animations: "disabled",
      });
      await region
        .getByRole("button", { name: "Read all", exact: true })
        .click();
      await expect
        .poll(
          async () =>
            (await (await student.get("/api/notifications")).json())
              .unreadCount,
        )
        .toBe(0);
      await page.reload();
      await page
        .getByRole("button", { name: "Notifications", exact: true })
        .click();
      await expect(
        region.getByRole("button", { name: "Read all", exact: true }),
      ).toBeDisabled();
      await region.getByRole("link", { name: /An assignment is open/ }).click();
      await expect(page).toHaveURL(
        new RegExp(`/assignments/${assignment.id}$`),
      );
      await expect(region).toHaveCount(0);
      expect(
        (await student.post(`${root}/finalize`, { data: {} })).status(),
      ).toBe(403);
      expect(
        (await teacher.post(`${root}/voting/stop`, { data: {} })).status(),
      ).toBe(200);
      expect(
        (await teacher.post(`${root}/finalize`, { data: {} })).status(),
      ).toBe(200);
      expect(
        (await teacher.post(`${root}/finalize`, { data: {} })).status(),
      ).toBe(400);
      const finalized = (await (
        await student.get("/api/notifications")
      ).json()) as NotificationPage;
      expect(finalized.items).toHaveLength(3);
      expect(
        finalized.items.filter((item) => item.kind === "results_finalized"),
      ).toHaveLength(1);
      const noOrigin = await playwright.request.newContext({
        baseURL,
        storageState: await student.storageState(),
      });
      try {
        expect(
          (
            await noOrigin.post("/api/notifications/read-all", { data: {} })
          ).status(),
        ).toBe(403);
      } finally {
        await noOrigin.dispose();
      }
    } finally {
      await Promise.all([
        teacher.dispose(),
        student.dispose(),
        other.dispose(),
        anonymous.dispose(),
        browserContext.close(),
      ]);
    }
  });

  test("atomic updates roll back notification failures and history pagination preserves tied timestamps", async ({
    playwright,
    baseURL,
    users,
  }) => {
    const teacher = await actor(playwright, baseURL!, users.teacher);
    const student = await actor(playwright, baseURL!, users.student);
    try {
      const assignment = await create(teacher);
      await student.post("/api/assignments/join", {
        data: { code: assignment.code },
      });
      const repository = new PostgresAssignmentRepository();
      const record = (await repository.findById(assignment.id))!;
      const badEvent = {
        kind: "invalid-kind",
        key: "must-roll-back",
      } as unknown as NotificationEvent;
      await expect(
        repository.update(
          { ...record.assignment, status: "active" },
          record.version,
          badEvent,
        ),
      ).rejects.toMatchObject({ code: "23514" });
      expect((await repository.findById(assignment.id))?.version).toBe(
        record.version,
      );
      expect(
        (await repository.findById(assignment.id))?.assignment.status,
      ).toBe("draft");
      expect(
        await repository.update(record.assignment, record.version - 1, {
          kind: "assignment_opened",
          key: "stale-version",
        }),
      ).toBe(false);
      expect(
        (await (await student.get("/api/notifications")).json()).items,
      ).toEqual([]);
      const sql = database();
      await sql`INSERT INTO notifications(id,user_id,assignment_id,kind,event_key,created_at)
        SELECT gen_random_uuid(),${users.student.id}::uuid,${assignment.id}::uuid,'assignment_opened',${users.runId}||'-'||number::text,now()
        FROM generate_series(1,25) AS number`;
      const first = (await (
        await student.get("/api/notifications")
      ).json()) as NotificationPage;
      expect(first.items).toHaveLength(20);
      expect(first.unreadCount).toBe(25);
      const second = (await (
        await student.get(
          `/api/notifications?before=${encodeURIComponent(first.nextCursor!)}`,
        )
      ).json()) as NotificationPage;
      expect(second.items).toHaveLength(5);
      expect(second.nextCursor).toBeNull();
      expect(
        new Set([...first.items, ...second.items].map((item) => item.id)).size,
      ).toBe(25);
      expect(
        (
          await student.post("/api/notifications/read-all", { data: {} })
        ).status(),
      ).toBe(200);
      expect(
        (await (await student.get("/api/notifications")).json()).unreadCount,
      ).toBe(0);
    } finally {
      await Promise.all([teacher.dispose(), student.dispose()]);
    }
  });
});
