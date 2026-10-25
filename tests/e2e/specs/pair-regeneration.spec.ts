import { seedAssignmentStudent } from "../seed/assignment-student";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const { Workbook } = createRequire(import.meta.url)(
  "exceljs",
) as typeof import("exceljs");
import { test, expect } from "../fixtures";
import { HomePage } from "../pages/HomePage";
import { AssignmentPage } from "../pages/AssignmentPage";
import { seed } from "@/features/assignments/data/demo-data";
import { database } from "@/shared/server/database";
import { PostgresAssignmentRepository } from "@/features/assignments/server/assignment-repository";
import type { Assignment } from "@/features/assignments/types";

for (const width of [1280, 390]) {
  test(`regenerate preview, student comparison and read-only history at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const data = seed();
    data[0].groups[0].members = data[0].groups[0].members.slice(0, 1);
    data[0].groups[1].members = data[0].groups[1].members.slice(0, 1);
    data[0].groups.push({
      id: "g3",
      name: "Third Group",
      members: [{ id: "s5", name: "Student Five" }],
    });
    data[0].students.push({ id: "s5", name: "Student Five" });
    await page.addInitScript((a) => {
      if (!localStorage.getItem("pair-eval-demo"))
        localStorage.setItem("pair-eval-demo", JSON.stringify(a));
    }, data);
    const home = new HomePage(page);
    const work = new AssignmentPage(page);
    await home.goto();
    await home.exploreDemo();
    await work.openAssignment(data[0].title);
    const regen = () =>
      page.getByRole("button", {
        name: "สร้างคู่ประเมินใหม่ (Re-generate Pairs)",
        exact: true,
      });
    await regen().click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("button", { name: "ยืนยันและเผยแพร่คู่ใหม่" }),
    ).toBeDisabled();
    await dialog.getByLabel("เหตุผลในการสร้างคู่ใหม่").fill("Test revised pairing");
    await dialog.getByRole("button", { name: "ตรวจสอบและดูตัวอย่างคู่ใหม่" }).click();
    await expect(dialog.getByText(/Coverage ที่ทำได้จริง/)).toBeVisible();
    await dialog.getByRole("button", { name: "ยืนยันและเผยแพร่คู่ใหม่" }).click();
    await expect(dialog.getByText(/เผยแพร่คู่ชุดใหม่แล้ว/)).toBeVisible();
    await dialog.getByRole("button", { name: "ปิด", exact: true }).click();
    await work.switchRole("student");
    await work.openAssignment(data[0].title);
    await expect(regen()).toHaveCount(0);
    await work.selectTab("ประเมินผลงาน");
    await expect(
      page.getByRole("heading", { name: "คู่ประเมิน Generation 1" }),
    ).toBeVisible();
    const card = page.getByTestId("pairwise-card").first();
    await expect(card).toContainText("The Next Gen");
    await expect(card).toContainText("Third Group");
    await expect(card).not.toContainText("Creative Minds");
    await card.getByRole("radio").last().check();
    await expect(
      page.getByRole("status").filter({ hasText: "บันทึกแล้ว เมื่อ" }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "ส่งผลประเมินคู่นี้" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "ส่งผลประเมิน", exact: true }).click();
    await expect(
      page.getByRole("dialog").getByText("ยังไม่ได้ตอบ 2 คู่", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "ยืนยันส่งผลประเมิน", exact: true })
      .click();
    await expect(page.getByText(/^ส่งผลประเมินแล้ว 1 \/ 3 คู่/)).toHaveCount(1);
    await page.reload();
    await work.selectTab("ประเมินผลงาน");
    await expect(page.getByText(/^ส่งผลประเมินแล้ว 1 \/ 3 คู่/)).toHaveCount(1);
    await work.switchRole("teacher");
    await work.openAssignment(data[0].title);
    await work.selectTab("ผลการประเมิน");
    const downloadEvent = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "ส่งออก Excel", exact: true })
      .click();
    const workbook = new Workbook();
    await workbook.xlsx.readFile((await (await downloadEvent).path())!);
    const coverage = workbook.getWorksheet("Pair Coverage")!;
    expect(coverage.rowCount).toBe(10);
    let submitted = 0;
    coverage.eachRow((row, index) => {
      if (index > 1) submitted += Number(row.getCell(7).value);
    });
    expect(submitted).toBe(1);
    let generation: unknown;
    workbook.getWorksheet("Metadata")!.eachRow((row) => {
      if (row.getCell(1).value === "Pair Generation")
        generation = row.getCell(2).value;
    });
    expect(generation).toBe(1);
    await regen().click();
    await dialog
      .getByLabel("เหตุผลในการสร้างคู่ใหม่")
      .fill("Refresh after roster review");
    await dialog.getByRole("button", { name: "ยืนยันนำกลับเป็น Draft" }).click();
    await expect(
      dialog.getByRole("button", { name: "ตรวจสอบและดูตัวอย่างคู่ใหม่" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "ตรวจสอบและดูตัวอย่างคู่ใหม่" }).click();
    await expect(dialog.getByText(/คำตอบเดิม 1 รายการ/)).toBeVisible();
    await dialog.getByRole("button", { name: "ยืนยันและเผยแพร่คู่ใหม่" }).click();
    await expect(dialog.getByText(/เผยแพร่คู่ชุดใหม่แล้ว/)).toBeVisible();
    await dialog.getByRole("button", { name: "ปิด", exact: true }).click();
    await work.switchRole("student");
    await work.openAssignment(data[0].title);
    await work.selectTab("ประเมินผลงาน");
    await expect(
      page.getByRole("heading", { name: "คู่ประเมิน Generation 2" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ส่งผลประเมินแล้ว" }),
    ).toHaveCount(0);
    await expect(page.getByText("ประวัติคำตอบเดิม (อ่านอย่างเดียว)")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: `tests/artifacts/pair-regeneration-${width}.png`,
      fullPage: true,
    });
  });
}

test("real PostgreSQL atomically stores regeneration, history, notifications and audit", async ({
  playwright,
  baseURL,
  users,
  browser,
}) => {
  test.skip(
    process.env.E2E_DATABASE_ENABLED !== "1",
    "Requires isolated guarded PostgreSQL",
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
    const thirdUser = (await registered.json()).user;
    users.createdUserIds.push(thirdUser.id);
    const created = await teacher.post("/api/assignments", {
      data: {
        title: "Generation integration",
        deadline: new Date(Date.now() + 86400000).toISOString(),
        questions: ["Quality"],
      },
    });
    expect(created.status()).toBe(201);
    let a = (await created.json()).assignment as Assignment;
    const root = `/api/assignments/${a.id}`;
    for (const [i, api] of [student, other, third].entries()) {
      expect((await seedAssignmentStudent(a.id, api)).status()).toBe(200);
      expect(
        (
          await api.post(`${root}/groups`, { data: { name: `Group ${i}` } })
        ).status(),
      ).toBe(201);
    }
    expect(
      (
        await student.post(`${root}/pairs/preview`, { data: { scope: "both" } })
      ).status(),
    ).toBe(403);
    const previewResponse = await teacher.post(`${root}/pairs/preview`, {
      data: { scope: "both" },
    });
    expect(previewResponse.status()).toBe(200);
    const preview = (await previewResponse.json()).preview;
    const input = {
      scope: "both",
      reason: "Integration generation",
      expectedGeneration: 0,
      previewToken: preview.token,
    };
    const concurrent = await Promise.all([
      teacher.post(`${root}/pairs/regenerate`, { data: input }),
      teacher.post(`${root}/pairs/regenerate`, { data: input }),
    ]);
    expect(concurrent.map((r) => r.status()).sort()).toEqual([200, 409]);
    const own = (await (await student.get(root)).json())
      .assignment as Assignment;
    expect(own.pairs).toHaveLength(1);
    expect(own.pairs![0].evaluator_user_id).toBe(users.student.id);
    const pairId = own.pairs![0].id;
    const ballot = { pairId, choice: 6, expectedGeneration: 1 };
    expect(
      (await other.post(`${root}/pairs/submit`, { data: ballot })).status(),
    ).toBe(403);
    expect(
      (await student.post(`${root}/pairs/submit`, { data: ballot })).status(),
    ).toBe(200);
    const batch = {
      side: "GROUP",
      expectedGeneration: 1,
      expectedRevision: 0,
      answers: [{ pairId, choice: 6, timeOnTaskMs: 4000 }],
    };
    expect(
      (
        await student.put(`${root}/pairs/drafts`, {
          data: { ...batch, answers: [{ pairId, choice: 1 }] },
        })
      ).status(),
    ).toBe(200);
    const withDraft = (await (await student.get(root)).json())
      .assignment as Assignment;
    expect(withDraft.evaluationDrafts![0].choice).toBe(1);
    expect(withDraft.comparisons![0].choice).toBe(6);
    const browserContext = await browser.newContext({
      storageState: await student.storageState(),
    });
    try {
      const page = await browserContext.newPage();
      await page.goto(root.replace("/api/", "/"));
      await page.getByRole("tab", { name: "ประเมินผลงาน", exact: true }).click();
      const choice = page
        .getByTestId("pairwise-card")
        .first()
        .getByRole("radio")
        .nth(1);
      let failNextSave = true;
      await page.route("**/pairs/drafts", async (route) => {
        if (failNextSave) {
          failNextSave = false;
          await route.abort();
        } else await route.continue();
      });
      await choice.check();
      await expect(
        page.getByRole("button", { name: "ลองบันทึกอีกครั้ง" }),
      ).toBeVisible();
      await expect(choice).toBeChecked();
      expect(
        (await (await student.get(root)).json()).assignment.evaluationDrafts[0]
          .choice,
      ).toBe(1);
      await page.getByRole("button", { name: "ลองบันทึกอีกครั้ง" }).click();
      await expect
        .poll(
          async () =>
            (await (await student.get(root)).json()).assignment
              .evaluationDrafts[0].choice,
        )
        .toBe(2);
      expect(
        (await (await student.get(root)).json()).assignment.comparisons[0]
          .choice,
      ).toBe(6);
    } finally {
      await browserContext.close();
    }
    expect(
      (await (await teacher.get(root)).json()).assignment.evaluationDrafts,
    ).toBeUndefined();
    expect(
      (await other.post(`${root}/submissions`, { data: batch })).status(),
    ).toBe(403);
    const submits = await Promise.all([
      student.post(`${root}/submissions`, { data: batch }),
      student.post(`${root}/submissions`, { data: batch }),
    ]);
    expect(submits.map((r) => r.status()).sort()).toEqual([200, 409]);
    expect(
      (await student.put(`${root}/pairs/drafts`, { data: batch })).status(),
    ).toBe(409);
    for (const revision of [1, 2]) {
      expect(
        (
          await student.post(`${root}/submissions`, {
            data: {
              ...batch,
              expectedRevision: revision,
              answers: [{ pairId, choice: revision === 1 ? 1 : 6 }],
            },
          })
        ).status(),
      ).toBe(200);
    }
    const submitted = (await (await student.get(root)).json())
      .assignment as Assignment;
    expect(
      submitted.evaluationSubmissions!.map((s) => s.comparisons[0].choice),
    ).toEqual([6, 1, 6]);
    expect(submitted.comparisons).toHaveLength(1);
    expect(submitted.comparisons![0].choice).toBe(6);
    expect(submitted.evaluationDrafts).toHaveLength(0);
    const repository = new PostgresAssignmentRepository();
    const beforeAuditFailure = (await repository.findById(a.id))!;
    await expect(
      repository.update(
        { ...beforeAuditFailure.assignment, comparisons: [] },
        beforeAuditFailure.version,
        undefined,
        {
          ...submitted.evaluationSubmissions!.at(-1)!,
          evaluatorId: randomUUID(),
        },
      ),
    ).rejects.toMatchObject({ code: "23503" });
    const afterAuditFailure = (await repository.findById(a.id))!;
    expect(afterAuditFailure.version).toBe(beforeAuditFailure.version);
    expect(afterAuditFailure.assignment.comparisons).toEqual(
      beforeAuditFailure.assignment.comparisons,
    );
    expect(
      (await (await other.get(root)).json()).assignment.evaluationSubmissions,
    ).toHaveLength(0);
    const inbox = (await (await student.get("/api/notifications")).json())
      .items;
    expect(
      inbox.filter((n: { kind: string }) => n.kind === "pairs_regenerated"),
    ).toHaveLength(1);
    expect(
      (
        await teacher.post(`${root}/pairs/unpublish`, {
          data: { reason: "Second generation", expectedGeneration: 1 },
        })
      ).status(),
    ).toBe(200);
    const preview2 = (
      await (
        await teacher.post(`${root}/pairs/preview`, { data: { scope: "both" } })
      ).json()
    ).preview;
    expect(
      (
        await teacher.post(`${root}/pairs/regenerate`, {
          data: {
            scope: "both",
            reason: "Second generation",
            expectedGeneration: 1,
            previewToken: preview2.token,
          },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await student.post(`${root}/pairs/submit`, { data: ballot })).status(),
    ).toBe(409);
    a = (await (await teacher.get(root)).json()).assignment;
    expect(a.pairGeneration).toBe(2);
    expect(a.comparisons).toHaveLength(0);
    expect(a.pairHistory!.at(-1)!.comparisons[0].choice).toBe(6);
    expect(a.pairHistory!.at(-1)!.evaluationSubmissions).toHaveLength(3);
    expect(
      (
        await student.post(`${root}/submissions`, {
          data: { ...batch, expectedRevision: 3 },
        })
      ).status(),
    ).toBe(409);
    const sql = database();
    const audit =
      await sql`SELECT action,reason FROM audit_logs WHERE assignment_id=${a.id} AND action='PAIRS_REGENERATE'`;
    expect(audit).toHaveLength(2);
    expect(audit.map((row) => row.reason).sort()).toEqual([
      "Integration generation",
      "Second generation",
    ]);
    const submissionAudit =
      await sql`SELECT actor_id,after_state FROM audit_logs WHERE assignment_id=${a.id} AND action='EVALUATION_SUBMIT' ORDER BY (after_state->>'revision')::int`;
    expect(submissionAudit).toHaveLength(3);
    expect(
      submissionAudit.every((row) => row.actor_id === users.student.id),
    ).toBe(true);
    expect(
      submissionAudit.map(
        (row) => (row.after_state as { revision: number }).revision,
      ),
    ).toEqual([1, 2, 3]);
    const notifications =
      await sql`SELECT event_key,count(*)::int AS count FROM notifications WHERE assignment_id=${a.id} AND kind='pairs_regenerated' GROUP BY event_key`;
    expect(notifications).toHaveLength(2);
    expect(notifications.every((row) => row.count === 3)).toBe(true);
  } finally {
    await Promise.all(contexts.map((c) => c.dispose()));
  }
});
