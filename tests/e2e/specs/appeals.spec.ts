import { test, expect } from "../fixtures";
import { seed, demoStudent } from "@/features/assignments/data/demo-data";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import { demoTeacher } from "@/features/auth/data/demo-users";
import { HomePage } from "../pages/HomePage";
import { AssignmentPage } from "../pages/AssignmentPage";
import { seedAssignmentStudent } from "../seed/assignment-student";
import { prepareLegacyAssignment } from "../seed/legacy-assignment";
import { database } from "@/shared/server/database";
import type { Assignment } from "@/features/assignments/types";

for (const width of [1280, 390]) {
  test(`student appeal and teacher override are visible and persist at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const data = seed();
    const a = data[0];
    a.status = "closed";
    a.pairs = [];
    applyAssignmentCommand(a, demoTeacher, "finalize", {});
    await page.addInitScript((items) => {
      if (!localStorage.getItem("pair-eval-demo"))
        localStorage.setItem("pair-eval-demo", JSON.stringify(items));
    }, data);
    const home = new HomePage(page);
    const work = new AssignmentPage(page);
    await home.goto();
    await home.exploreDemo();
    await work.switchRole("student");
    await work.openAssignment(a.title);
    await work.selectTab("อุทธรณ์คะแนน");
    await page
      .getByRole("textbox", { name: "เหตุผลการอุทธรณ์", exact: true })
      .fill("ขอให้ตรวจสอบคะแนนการมีส่วนร่วมของฉัน");
    await page
      .getByRole("button", { name: "ยื่นอุทธรณ์คะแนน", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "ส่งคำร้องอุทธรณ์สำเร็จ" }),
    ).toBeVisible();
    await expect(page.getByText("รอพิจารณา", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ยื่นอุทธรณ์คะแนน", exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await work.selectTab("อุทธรณ์คะแนน");
    await expect(
      page.getByText("ขอให้ตรวจสอบคะแนนการมีส่วนร่วมของฉัน", { exact: true }),
    ).toBeVisible();
    await work.switchRole("teacher");
    await work.openAssignment(a.title);
    await work.selectTab("อุทธรณ์คะแนน");
    await page.getByLabel("ผลการพิจารณา", { exact: true }).click();
    await page
      .getByRole("option", { name: "ปรับคะแนนรวม", exact: true })
      .click();
    await page
      .getByRole("spinbutton", { name: "คะแนนรวมใหม่", exact: true })
      .fill("13.5");
    await page
      .getByRole("textbox", { name: "คำตอบและเหตุผลของอาจารย์", exact: true })
      .fill("ตรวจสอบหลักฐานแล้ว ปรับคะแนนการมีส่วนร่วมให้ถูกต้อง");
    await page
      .getByRole("button", { name: "บันทึกผลการพิจารณา", exact: true })
      .click();
    await expect(
      page.getByText("ปรับคะแนนรวมเป็น 13.5 / 20", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "บันทึกผลการพิจารณา", exact: true }),
    ).toHaveCount(0);
    await work.switchRole("student");
    await work.openAssignment(a.title);
    await work.selectTab("อุทธรณ์คะแนน");
    await expect(
      page.getByText("ปรับคะแนนรวมเป็น 13.5 / 20", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("คำร้องของคุณ", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `tests/artifacts/appeals-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await work.selectTab("ประเมินผลงาน");
    await expect(
      page.getByRole("alert").filter({ hasText: "participation: 13.5" }),
    ).toBeVisible();
    const stored = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("pair-eval-demo")!)[0] as Assignment,
    );
    expect(stored.appeals?.[0].studentId).toBe(demoStudent.id);
    expect(stored.finalizedSnapshot).toEqual(a.finalizedSnapshot);
  });
}

test("PostgreSQL appeal authorization, atomic audit, private reads and concurrent decisions", async ({
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
  try {
    const created = await teacher.post("/api/assignments", {
      data: {
        title: "Appeals regression",
        subject: "Testing",
        deadline: new Date(Date.now() + 86400000).toISOString(),
        questions: ["Quality"],
      },
    });
    expect(created.status()).toBe(201);
    const a = (await created.json()).assignment as Assignment;
    await prepareLegacyAssignment(a.id);
    expect((await seedAssignmentStudent(a.id, student)).status()).toBe(200);
    expect((await seedAssignmentStudent(a.id, other)).status()).toBe(200);
    for (const [index, api] of [student, other].entries()) {
      const grouped = await teacher.post(`/api/assignments/${a.id}/groups`, {
        data: { name: `Group ${index + 1}` },
      });
      expect(grouped.status()).toBe(201);
      const groupId = (
        (await grouped.json()).assignment as Assignment
      ).groups.at(-1)!.id;
      expect(
        (
          await api.post(`/api/assignments/${a.id}/groups/join`, {
            data: { groupId },
          })
        ).status(),
      ).toBe(200);
    }
    for (const command of ["voting/start", "voting/stop", "finalize"])
      expect(
        (
          await teacher.post(`/api/assignments/${a.id}/${command}`, {
            data: {},
          })
        ).status(),
      ).toBe(200);
    const before = (
      await (await teacher.get(`/api/assignments/${a.id}`)).json()
    ).assignment as Assignment;
    const expectedFinalizedAt = before.finalizedSnapshot!.finalizedAt;
    const input = {
      id: a.id,
      expectedFinalizedAt,
      message: "Please verify my score",
    };
    expect((await teacher.post("/api/appeals", { data: input })).status()).toBe(
      403,
    );
    const requests = await Promise.all([
      student.post("/api/appeals", { data: input }),
      student.post("/api/appeals", { data: input }),
    ]);
    expect(requests.map((r) => r.status()).sort()).toEqual([200, 409]);
    expect(
      (
        await other.post("/api/appeals", {
          data: { ...input, message: "Other private appeal" },
        })
      ).status(),
    ).toBe(200);
    const studentView = (
      await (await student.get(`/api/assignments/${a.id}`)).json()
    ).assignment as Assignment;
    expect(studentView.appeals).toHaveLength(1);
    expect(studentView.appeals![0].message).toBe(input.message);
    expect(studentView.finalizedSnapshot).toBeUndefined();
    expect(studentView.finalizedAt).toBe(expectedFinalizedAt);
    const appealId = studentView.appeals![0].id;
    const decision = {
      appealId,
      expectedFinalizedAt,
      outcome: "override",
      response: "Reviewed and corrected",
      score: 12.5,
    };
    expect(
      (
        await student.put(`/api/assignments/${a.id}/appeals`, {
          data: decision,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await teacher.put(`/api/assignments/${a.id}/appeals`, {
          data: { ...decision, score: 99 },
        })
      ).status(),
    ).toBe(400);
    const resolutions = await Promise.all([
      teacher.put(`/api/assignments/${a.id}/appeals`, { data: decision }),
      teacher.put(`/api/assignments/${a.id}/appeals`, { data: decision }),
    ]);
    expect(resolutions.map((r) => r.status()).sort()).toEqual([200, 409]);
    const after = (await (await teacher.get(`/api/assignments/${a.id}`)).json())
      .assignment as Assignment;
    expect(after.finalizedSnapshot).toEqual(before.finalizedSnapshot);
    expect(after.appeals).toHaveLength(2);
    expect(after.appeals!.find((r) => r.id === appealId)!.decision!.score).toBe(
      12.5,
    );
    const sql = database();
    const logs =
      await sql`SELECT action,actor_id,before_state,after_state FROM audit_logs WHERE assignment_id=${a.id} AND resource_type='appeal' ORDER BY created_at`;
    expect(logs.map((r) => r.action).sort()).toEqual([
      "APPEAL_SUBMIT",
      "APPEAL_SUBMIT",
      "SCORE_OVERRIDE",
    ]);
    const override = logs.find((r) => r.action === "SCORE_OVERRIDE")!;
    expect(
      (override.before_state as { decision?: unknown }).decision,
    ).toBeUndefined();
    expect(
      (override.after_state as { decision: { score: number } }).decision.score,
    ).toBe(12.5);
    const otherView = (
      await (await other.get(`/api/assignments/${a.id}`)).json()
    ).assignment as Assignment;
    expect(otherView.appeals).toHaveLength(1);
    expect(otherView.appeals![0].message).toBe("Other private appeal");
    expect(otherView.appeals![0].decision).toBeUndefined();
  } finally {
    for (const api of contexts) await api.dispose();
  }
});
