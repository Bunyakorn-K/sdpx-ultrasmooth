import { test, expect } from "../fixtures";
import { HomePage } from "../pages/HomePage";
import { AssignmentPage } from "../pages/AssignmentPage";
import {
  seed,
  demoTeacher,
  demoStudent,
} from "@/features/assignments/data/demo-data";
import { previewRegeneration } from "@/features/pairwise/domain/regeneration";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import type { Assignment } from "@/features/assignments/types";

for (const width of [1280, 390]) {
  test(`autosaved drafts, partial bulk submit, resubmit and separate sides at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const data = seed();
    const a = data[0];
    a.groups[0].members.push({ id: "s5", name: "Student Five" });
    a.groups[1].members.push({ id: "s6", name: "Student Six" });
    a.groups.push({
      id: "g3",
      name: "Third Group",
      members: [7, 8, 9].map((n) => ({ id: `s${n}`, name: `Student ${n}` })),
    });
    a.students = a.groups.flatMap((g) => g.members);
    a.targetCoverage = 3;
    const plan = previewRegeneration(a, "both");
    applyAssignmentCommand(a, demoTeacher, "regeneratePairs", {
      scope: "both",
      reason: "Test evaluation",
      expectedGeneration: 0,
      previewToken: plan.token,
    });
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
    await work.selectTab("ประเมินผลงาน");
    const cards = page.getByTestId("pairwise-card").filter({ visible: true });
    const persisted = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("pair-eval-demo")!)[0] as Assignment,
      );
    const submit = async () => {
      await page
        .getByRole("button", { name: /^ส่งผลประเมิน(ใหม่)?$/, exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "ยืนยันส่งผลประเมิน", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeHidden();
      const notification = page
        .getByRole("alert")
        .filter({ hasText: "ส่งผลประเมินสำเร็จ" });
      await expect(notification).toBeVisible();
      await notification.getByRole("button", { name: "Close" }).click();
    };
    await expect(cards).toHaveCount(3);
    await expect(
      page.getByRole("button", { name: "ส่งผลประเมิน", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "ส่งผลประเมินคู่นี้" }),
    ).toHaveCount(0);
    await cards.first().getByRole("radio").last().check();
    await expect
      .poll(async () => (await persisted()).evaluationDrafts?.length)
      .toBe(1);
    expect((await persisted()).comparisons).toHaveLength(0);
    await page.reload();
    await work.selectTab("ประเมินผลงาน");
    await expect(cards.first().getByRole("radio").last()).toBeChecked();
    await page
      .getByRole("button", { name: "ส่งผลประเมิน", exact: true })
      .click();
    await expect(
      page.getByRole("dialog").getByText(/ยังไม่ได้ตอบ 2 คู่/),
    ).toBeVisible();
    await page.getByRole("button", { name: "กลับไปตรวจทาน" }).click();
    await expect(cards.first().getByRole("radio").last()).toBeChecked();
    await submit();
    await expect
      .poll(async () => (await persisted()).evaluationSubmissions?.length)
      .toBe(1);
    expect((await persisted()).comparisons![0].choice).toBe(6);
    await cards.first().getByRole("radio").first().check();
    await expect
      .poll(async () => (await persisted()).evaluationDrafts?.[0]?.choice)
      .toBe(1);
    expect((await persisted()).comparisons![0].choice).toBe(6);
    await submit();
    await expect
      .poll(async () => (await persisted()).evaluationSubmissions?.length)
      .toBe(2);
    let saved = await persisted();
    expect(saved.comparisons![0].choice).toBe(1);
    expect(saved.evaluationSubmissions![0].comparisons[0].choice).toBe(6);
    // Submit immediately after new selections, including any queued autosave.
    await cards.nth(1).getByRole("radio").last().check();
    await cards.nth(2).getByRole("radio").last().check();
    await submit();
    saved = await persisted();
    expect(saved.comparisons).toHaveLength(3);
    expect(saved.evaluationSubmissions!.at(-1)!.revision).toBe(3);
    await work.selectTab("ประเมินเพื่อนในกลุ่ม");
    await expect(cards).toHaveCount(3);
    await cards.first().getByRole("radio").last().check();
    await submit();
    saved = await persisted();
    expect(saved.comparisons).toHaveLength(4);
    expect(saved.evaluationSubmissions!.at(-1)!.side).toBe("INDIVIDUAL");
    expect(saved.evaluationSubmissions!.at(-1)!.revision).toBe(1);
    expect(
      saved.evaluationSubmissions!.filter(
        (s) => s.evaluatorId === demoStudent.id && s.side === "GROUP",
      ),
    ).toHaveLength(3);
    await work.selectTab("ประเมินผลงานกลุ่ม");
    await expect(cards.first().getByRole("radio").first()).toBeChecked();
    await expect(page.getByText(/^ส่งผลประเมินแล้ว 3 \/ 3 คู่/)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("region", { name: "สรุปประเมินผลงานกลุ่ม", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `tests/artifacts/evaluation-submission-${width}.png`,
      fullPage: true,
    });
    await page.evaluate(() => {
      const items = JSON.parse(localStorage.getItem("pair-eval-demo")!);
      items[0].deadline = "2020-01-01T00:00:00Z";
      localStorage.setItem("pair-eval-demo", JSON.stringify(items));
    });
    // The server may reject a submission after the page's last deadline check.
    await page
      .getByRole("button", { name: "ส่งผลประเมินใหม่", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "ยืนยันส่งผลประเมิน", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({
        hasText: "ส่งผลประเมินไม่สำเร็จ กรุณาตรวจสอบข้อผิดพลาดแล้วลองอีกครั้ง",
      }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect((await persisted()).evaluationSubmissions).toHaveLength(4);
    await page.getByRole("button", { name: "กลับไปตรวจทาน" }).click();
    await expect(cards.first().getByRole("radio").first()).toBeChecked();
    await page.reload();
    await work.selectTab("ประเมินผลงาน");
    await expect(
      page.getByRole("button", { name: "ส่งผลประเมินใหม่", exact: true }),
    ).toBeDisabled();
    for (const radio of await cards.first().getByRole("radio").all())
      await expect(radio).toBeDisabled();
    expect((await persisted()).comparisons).toHaveLength(4);
  });
}
