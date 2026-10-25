import { seedAssignmentStudent } from "../seed/assignment-student";
import { randomBytes, randomUUID } from "node:crypto";
import { test, expect } from "../fixtures";
import { seed, demoStudent } from "@/features/assignments/data/demo-data";
import type { Assignment } from "@/features/assignments/types";
import { HomePage } from "../pages/HomePage";
import { AssignmentPage } from "../pages/AssignmentPage";
import { database } from "@/shared/server/database";

for (const width of [1280, 390]) {
  test(`first publication previews before opening and assigns each student eligible pairs at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const data = seed();
    const a = data[0];
    a.pairwiseRequired = true;
    a.groups = [1, 2, 3].map((n) => ({
      id: `g${n}`,
      name: `Group ${n}`,
      members: [1, 2, 3, 4].map((m) => ({
        id: n === 1 && m === 1 ? demoStudent.id : `s${n}-${m}`,
        name: `Student ${n}-${m}`,
      })),
    }));
    a.students = a.groups.flatMap((g) => g.members);
    await page.addInitScript((items) => {
      if (!localStorage.getItem("pair-eval-demo"))
        localStorage.setItem("pair-eval-demo", JSON.stringify(items));
    }, data);
    const home = new HomePage(page);
    const work = new AssignmentPage(page);
    await home.goto();
    await home.exploreDemo();
    await work.openAssignment(a.title);
    await expect(
      page.getByRole("button", { name: /Re-generate Pairs/ }),
    ).toHaveCount(0);
    await work.beginVoting();
    const dialog = page.getByRole("dialog", {
      name: "ตรวจสอบคู่ก่อนเริ่มประเมิน",
    });
    await expect(dialog.getByText(/Coverage ที่ทำได้จริง/)).toBeVisible();
    await expect(work.stopButton).toHaveCount(0);
    const stored = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("pair-eval-demo")!)[0] as Assignment,
      );
    expect((await stored()).pairs).toBeUndefined();
    await dialog.getByRole("button", { name: "กลับไปแก้ไข" }).click();
    expect((await stored()).status).toBe("draft");
    await work.beginVoting();
    await expect(
      dialog.getByRole("button", { name: "ยืนยันและเริ่มประเมิน" }),
    ).toBeEnabled();
    await dialog.screenshot({
      path: `tests/artifacts/first-publication-${width}.png`,
      animations: "disabled",
    });
    await dialog.getByRole("button", { name: "ยืนยันและเริ่มประเมิน" }).click();
    await expect(dialog).toBeHidden();
    await expect(work.stopButton).toBeVisible();
    const published = await stored();
    expect(published.pairGeneration).toBe(1);
    expect(published.pairs?.filter((p) => p.side === "GROUP")).toHaveLength(36);
    expect(published.pairHistory).toEqual([]);
    await work.switchRole("student");
    await work.openAssignment(a.title);
    await work.selectTab("ประเมินผลงาน");
    const cards = page.getByTestId("pairwise-card").filter({ visible: true });
    await expect(cards).toHaveCount(3);
    for (const card of await cards.all()) {
      await expect(card).toContainText("Group 2");
      await expect(card).toContainText("Group 3");
      await expect(card).not.toContainText("Group 1");
    }
    await expect(
      page.getByRole("button", { name: "ส่งผลประเมินคู่นี้" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("PostgreSQL first publication atomically stores pairs, opened notifications and publish audit", async ({
  playwright,
  baseURL,
  users,
}) => {
  test.skip(
    process.env.E2E_DATABASE_ENABLED !== "1",
    "Requires guarded isolated PostgreSQL",
  );
  const contexts = [];
  for (const account of [users.teacher, users.student, users.other]) {
    const api = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { origin: new URL(baseURL!).origin },
    });
    expect(
      (
        await api.post("/api/auth/login", {
          data: { email: account.email, password: account.password },
        })
      ).status(),
    ).toBe(200);
    contexts.push(api);
  }
  const [teacher, student, other] = contexts;
  const third = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: new URL(baseURL!).origin },
  });
  contexts.push(third);
  try {
    const registered = await third.post("/api/auth/register", {
      data: {
        name: "Third Student",
        email: `${randomUUID()}@e2e.invalid`,
        password: randomBytes(24).toString("hex"),
        role: "student",
      },
    });
    expect(registered.status()).toBe(201);
    users.createdUserIds.push((await registered.json()).user.id);
    const response = await teacher.post("/api/assignments", {
      data: {
        title: "First publication",
        deadline: new Date(Date.now() + 72 * 3600000).toISOString(),
        questions: ["Quality"],
        pairwiseRequired: false,
      },
    });
    expect(response.status()).toBe(201);
    const a = (await response.json()).assignment as Assignment;
    expect(a.pairwiseRequired).toBe(true);
    const root = `/api/assignments/${a.id}`;
    for (const [index, api] of [student, other, third].entries()) {
      expect((await seedAssignmentStudent(a.id, api)).status()).toBe(200);
      expect(
        (
          await api.post(`${root}/groups`, { data: { name: `Group ${index}` } })
        ).status(),
      ).toBe(201);
    }
    expect(
      (await teacher.post(`${root}/voting/start`, { data: {} })).status(),
    ).toBe(409);
    expect(
      (
        await student.post(`${root}/pairs/preview`, { data: { scope: "both" } })
      ).status(),
    ).toBe(403);
    const previewResponse = await teacher.post(`${root}/pairs/preview`, {
      data: { scope: "both" },
    });
    expect(previewResponse.status()).toBe(200);
    const plan = (await previewResponse.json()).preview;
    const input = { expectedGeneration: 0, previewToken: plan.token };
    const results = await Promise.all([
      teacher.post(`${root}/voting/start`, { data: input }),
      teacher.post(`${root}/voting/start`, { data: input }),
    ]);
    expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
    const persisted = (await (await teacher.get(root)).json())
      .assignment as Assignment;
    expect(persisted.pairGeneration).toBe(1);
    expect(persisted.pairs).toHaveLength(3);
    expect(persisted.pairHistory).toEqual([]);
    const own = (await (await student.get(root)).json())
      .assignment as Assignment;
    expect(own.pairs).toHaveLength(1);
    expect(own.pairs![0].evaluator_user_id).toBe(users.student.id);
    const ownGroup = own.groups.find((g) =>
      g.members.some((m) => m.id === users.student.id),
    )!;
    expect([own.pairs![0].item_a_id, own.pairs![0].item_b_id]).not.toContain(
      ownGroup.id,
    );
    const inbox = (await (await student.get("/api/notifications")).json())
      .items;
    expect(
      inbox
        .filter((n: { assignmentId: string }) => n.assignmentId === a.id)
        .map((n: { kind: string }) => n.kind),
    ).toEqual(["assignment_opened"]);
    const sql = database();
    const audit =
      await sql`SELECT action FROM audit_logs WHERE assignment_id=${a.id}::uuid`;
    expect(audit.map((row) => row.action)).toEqual(["ASSIGNMENT_PUBLISH"]);
    expect(
      (
        await student.post(`${root}/votes`, {
          data: { groupId: own.pairs![0].item_a_id, scores: [6] },
        })
      ).status(),
    ).toBe(409);
  } finally {
    await Promise.all(contexts.map((api) => api.dispose()));
  }
});
