import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { test, expect } from "../fixtures";
import { HomePage } from "../pages/HomePage";
import { AssignmentPage } from "../pages/AssignmentPage";
import { worksheetToCsv } from "../../../src/features/pairwise/services/csv-service";
const { Workbook } = createRequire(import.meta.url)(
  "exceljs",
) as typeof import("exceljs");

for (const width of [1280, 390]) {
  test(`teacher downloads all CSV reports matching Excel at ${width}px; student cannot export`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const home = new HomePage(page);
    const assignment = new AssignmentPage(page);
    await home.goto();
    await home.exploreDemo();
    await assignment.openAssignment("ออกแบบนวัตกรรมเพื่อชุมชน");
    await assignment.beginVoting();
    await assignment.switchRole("student");
    await assignment.openAssignment("ออกแบบนวัตกรรมเพื่อชุมชน");
    await assignment.selectTab("ประเมินผลงาน");
    await assignment.evaluateGroup([6, 4, 5]);
    await assignment.switchRole("teacher");
    await assignment.openAssignment("ออกแบบนวัตกรรมเพื่อชุมชน");
    await assignment.stopVoting();
    await assignment.selectTab("ผลการประเมิน");
    const excelDownload = page.waitForEvent("download");
    await assignment.exportButton.click();
    const workbook = new Workbook();
    await workbook.xlsx.readFile((await (await excelDownload).path())!);
    expect(workbook.getWorksheet("Group Summary")!.rowCount).toBeGreaterThan(1);
    expect(workbook.getWorksheet("Pair Coverage")!.rowCount).toBeGreaterThan(1);
    for (const [report, label, sheet] of [
      ["group-summary", "สรุปคะแนนกลุ่ม", "Group Summary"],
      ["individual-summary", "สรุปคะแนนรายบุคคล", "Individual Summary"],
      ["pair-coverage", "ความครอบคลุมคู่", "Pair Coverage"],
    ]) {
      await page
        .getByRole("button", { name: "ส่งออก CSV", exact: true })
        .click();
      const downloadEvent = page.waitForEvent("download");
      await page.getByRole("menuitem", { name: label, exact: true }).click();
      const download = await downloadEvent;
      expect(download.suggestedFilename()).toMatch(
        new RegExp(`_${report}_\\d{8}-\\d{4}\\.csv$`),
      );
      const bytes = await readFile((await download.path())!);
      expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
      expect(bytes.toString("utf8")).toBe(
        worksheetToCsv(workbook.getWorksheet(sheet)!),
      );
    }
    await assignment.switchRole("student");
    await assignment.openAssignment("ออกแบบนวัตกรรมเพื่อชุมชน");
    await expect(
      page.getByRole("button", { name: "ส่งออก CSV", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "ส่งออก Excel", exact: true }),
    ).toHaveCount(0);
  });
}
