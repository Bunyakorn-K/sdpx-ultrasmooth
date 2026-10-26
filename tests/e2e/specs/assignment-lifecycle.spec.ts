import { test, expect } from "../fixtures";
import { HomePage } from "../pages/HomePage";
import { AssignmentPage } from "../pages/AssignmentPage";
import { seed } from "@/features/assignments/data/demo-data";

test("FR-ASSIGN-01..06: Teacher can update deadline, unpublish to draft, and clone assignment", async ({
  page,
}) => {
  const data = seed();
  const demoAsgn = data[0];
  demoAsgn.artifactUrl = "https://example.com/project-artifact";
  demoAsgn.status = "active";

  await page.addInitScript((items: unknown) => {
    localStorage.setItem("pair-eval-demo", JSON.stringify(items));
  }, data);

  const home = new HomePage(page);
  const work = new AssignmentPage(page);

  await home.goto();
  await home.exploreDemo();
  await work.openAssignment(demoAsgn.title);

  // FR-ASSIGN-01: Artifact link button is rendered
  const artifactBtn = page.getByRole("link", {
    name: /ดูผลงานต้นฉบับ/,
  });
  await expect(artifactBtn).toBeVisible();
  await expect(artifactBtn).toHaveAttribute(
    "href",
    "https://example.com/project-artifact",
  );

  // FR-ASSIGN-04: Edit Deadline dialog
  const editDeadlineBtn = page.getByRole("button", {
    name: "แก้ไขกำหนดส่ง",
  });
  await expect(editDeadlineBtn).toBeVisible();
  await editDeadlineBtn.click();

  const deadlineDialog = page.getByRole("dialog");
  await expect(
    deadlineDialog.getByRole("heading", { name: "แก้ไขกำหนดส่งงาน" }),
  ).toBeVisible();
  await expect(deadlineDialog.getByText(/ขยายเวลาได้ตลอดเวลา/)).toBeVisible();

  // Extend deadline to 14 days in the future
  const future14 = new Date(Date.now() + 14 * 86400000)
    .toISOString()
    .slice(0, 16);
  await deadlineDialog.locator('input[type="datetime-local"]').fill(future14);
  await deadlineDialog.getByRole("button", { name: "บันทึกกำหนดส่ง" }).click();
  await expect(deadlineDialog).toBeHidden();

  // FR-ASSIGN-03: Unpublish action button and confirmation dialog
  const unpublishBtn = page.getByRole("button", {
    name: "นำกลับเป็น Draft (Unpublish)",
  });
  await expect(unpublishBtn).toBeVisible();
  await unpublishBtn.click();

  const unpublishDialog = page.getByRole("dialog");
  await expect(
    unpublishDialog.getByRole("heading", {
      name: "ยืนยันนำกลับเป็น Draft (Unpublish)",
    }),
  ).toBeVisible();
  await expect(
    unpublishDialog.getByText(/การนำกลับเป็น Draft จะยกเลิกคู่ประเมิน/),
  ).toBeVisible();

  // Fill required reason
  await unpublishDialog
    .getByLabel(/เหตุผลในการนำกลับเป็น Draft/)
    .fill("Need to update criteria and roster");
  await unpublishDialog
    .getByRole("button", { name: "ยืนยันนำกลับเป็น Draft" })
    .click();
  await expect(unpublishDialog).toBeHidden();

  // Status must now be Draft
  await expect(page.getByText("รอเริ่มโหวต")).toBeVisible();

  // FR-ASSIGN-06: Clone assignment
  const cloneBtn = page.getByRole("button", { name: "คัดลอกงาน (Clone)" });
  await expect(cloneBtn).toBeVisible();
  await cloneBtn.click();

  // Cloned assignment heading appears with (สำเนา) and is in draft
  await expect(
    page.getByRole("heading", {
      name: new RegExp(`${demoAsgn.title} \\(สำเนา\\)`),
    }),
  ).toBeVisible();
  await expect(page.getByText("รอเริ่มโหวต")).toBeVisible();

  // Cloned assignment preserves artifactUrl
  const clonedArtifact = page.getByRole("link", {
    name: /ดูผลงานต้นฉบับ/,
  });
  await expect(clonedArtifact).toBeVisible();
});
