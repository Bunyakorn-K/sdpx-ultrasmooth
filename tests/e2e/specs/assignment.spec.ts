import { createRequire } from "node:module";
const { Workbook } = createRequire(import.meta.url)(
  "exceljs",
) as typeof import("exceljs");
import { test, expect } from "../fixtures";
import { HomePage } from "../pages/HomePage";
import { AssignmentPage } from "../pages/AssignmentPage";
import { futureLocalDeadline } from "../seed/test-data";
// US06 AC1 → US07 AC1/AC2 → US08 AC1 → US10 AC1.
test("US06-US10: open voting, evaluate another group once, close and export", async ({
  page,
}) => {
  const home = new HomePage(page);
  const assignment = new AssignmentPage(page);
  await home.goto();
  await home.exploreDemo();
  await assignment.openAssignment("ออกแบบนวัตกรรมเพื่อชุมชน");
  await assignment.beginVoting();
  await expect(assignment.stopButton).toBeVisible();
  await assignment.switchRole("student");
  await assignment.openAssignment("ออกแบบนวัตกรรมเพื่อชุมชน");
  await assignment.selectTab("ประเมินผลงาน");
  await expect(assignment.groups).toHaveCount(1);
  await assignment.evaluateGroup([5, 4, 5]);
  await expect(assignment.votedButton).toBeDisabled();
  await assignment.switchRole("teacher");
  await assignment.openAssignment("ออกแบบนวัตกรรมเพื่อชุมชน");
  await assignment.stopVoting();
  await assignment.selectTab("ผลการประเมิน");
  await expect(assignment.resultScores.first()).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await assignment.exportButton.click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  const path = await download.path();
  expect(path).not.toBeNull();
  const workbook = new Workbook();
  await workbook.xlsx.readFile(path!);
  expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
    "Group Summary",
    "Individual Summary",
    "Pair Coverage",
    "Metadata",
  ]);
  await page.screenshot({
    path: "tests/artifacts/results-desktop.png",
    fullPage: true,
  });
});
// US02 AC1 + US03 AC1 + US04 AC2 + US09 AC1.
test("US02-US04-US09: import questions, create work, join by code and select a group", async ({
  page,
}) => {
  const home = new HomePage(page);
  const assignment = new AssignmentPage(page);
  await home.goto();
  await home.exploreDemo();
  await assignment.createWork(
    "งานทดสอบ Excel",
    "เทคโนโลยี",
    futureLocalDeadline(),
  );
  const wb = new Workbook();
  const sheet = wb.addWorksheet("Questions");
  sheet.addRow(["คำถาม"]);
  sheet.addRow(["ความคิดสร้างสรรค์"]);
  sheet.addRow(["ความครบถ้วน"]);
  await assignment.dialog.locator("input[type=file]").setInputFiles({
    name: "questions.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
  });
  await expect(
    assignment.dialog.getByLabel("คำถาม (1 บรรทัดต่อ 1 คำถาม)"),
  ).toHaveValue("ความคิดสร้างสรรค์\nความครบถ้วน");
  await assignment.dialog
    .getByRole("button", { name: "สร้าง assignment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "งานทดสอบ Excel" }),
  ).toBeVisible();
  const code = (await assignment.joinCode.innerText()).trim();
  await assignment.createGroup("กลุ่มทดสอบ");
  await assignment.switchRole("student");
  await assignment.joinAssignment(code);
  await assignment.joinExistingGroup();
  await expect(page.getByText("กลุ่มของฉัน", { exact: true })).toBeVisible();
  await assignment.selectTab("คำถาม (2)");
  await expect(
    page.getByText("ความคิดสร้างสรรค์", { exact: true }),
  ).toBeVisible();
});
// US06 AC2: no opening a vote with fewer than two populated groups.
test("US06 AC2: insufficient groups prevent opening a vote", async ({
  page,
}) => {
  const home = new HomePage(page);
  const assignment = new AssignmentPage(page);
  await home.goto();
  await home.exploreDemo();
  await assignment.createWork(
    "ยังไม่มีกลุ่ม",
    "การเรียนรู้",
    futureLocalDeadline(),
  );
  await assignment.dialog
    .getByRole("button", { name: "สร้าง assignment", exact: true })
    .click();
  await assignment.beginVoting();
  await expect(
    page.getByRole("alert").filter({ hasText: "อย่างน้อย 2 กลุ่ม" }),
  ).toContainText("อย่างน้อย 2 กลุ่ม");
  await expect(assignment.startButton).toBeVisible();
});


