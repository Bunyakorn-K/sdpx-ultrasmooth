import { test, expect } from "@playwright/test";
import { HomePage } from "../pages/HomePage";

test("FR-CLASS-01: teacher creates a new classroom and views classroom detail", async ({
  page,
}) => {
  const home = new HomePage(page);
  await home.goto();
  await home.exploreDemo();

  // Navigate to Classrooms via sidebar
  await page.getByRole("button", { name: "ห้องเรียนของฉัน" }).click();
  await expect(page.getByRole("heading", { name: "ห้องเรียนของฉัน (Classrooms)" })).toBeVisible();

  // Open Create Classroom dialog
  await page.getByTestId("create-classroom-button").click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Fill in classroom details
  await page.getByLabel("ชื่อห้องเรียน (Classroom Name)").fill("วิศวกรรมซอฟต์แวร์ ภาค 1/2569");
  await page.getByRole("button", { name: "สร้าง Classroom", exact: true }).click();

  // Verify new classroom is displayed in list
  await expect(
    page.getByRole("heading", { name: "วิศวกรรมซอฟต์แวร์ ภาค 1/2569" }),
  ).toBeVisible();

  // Enter classroom detail
  const newClassroomCard = page
    .getByTestId("classroom-card")
    .filter({ hasText: "วิศวกรรมซอฟต์แวร์ ภาค 1/2569" });
  await newClassroomCard.getByRole("link", { name: "เข้าสู่ห้องเรียน" }).click();

  // Check classroom detail tabs
  await expect(
    page.getByRole("heading", { name: "วิศวกรรมซอฟต์แวร์ ภาค 1/2569" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /Assignment/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /นักศึกษาและกลุ่ม/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /ผู้สอน & TA/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /การตั้งค่าห้องเรียน/ })).toBeVisible();
});
