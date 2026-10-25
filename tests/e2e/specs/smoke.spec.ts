import { test, expect } from "../fixtures";
import { HomePage } from "../pages/HomePage";
// US00 AC1: landing page is accessible and provides the main call to action.
test("US00: homepage, navigation and main action are accessible", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const home = new HomePage(page);
  await home.goto();
  await expect(page).toHaveTitle(/Peerly/);
  await expect(home.title).toBeVisible();
  await expect(home.navigation).toBeVisible();
  await expect(home.mainCta).toBeVisible();
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok", service: "peerly" });
  await page.screenshot({
    path: "tests/artifacts/landing-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(home.audienceCards).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "tests/artifacts/landing-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
// US01 AC4 / SEC06: no public test data mutation endpoint in any environment.
test("SEC06: test support cannot be used without its isolated-environment credential", async ({
  request,
}) => {
  for (const path of ["/api/test/seed", "/api/test/cleanup"])
    expect((await request.post(path, { data: {} })).status()).toBe(404);
});

// US01 AC1 / UI: /login and /register screens provide role selection and navigation.
test("US01: auth screens render login and register forms with role selection and transitions", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "ยินดีต้อนรับกลับมา" }),
  ).toBeVisible();
  await expect(page.getByLabel("อีเมล")).toBeVisible();
  await expect(page.getByLabel("รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)")).toBeVisible();

  // Switch to register screen
  await page.getByRole("button", { name: "ยังไม่มีบัญชี? สมัครสมาชิก" }).click();
  await expect(page).toHaveURL(/\/register/);
  await expect(
    page.getByRole("heading", { name: "เริ่มต้นการเรียนรู้ร่วมกัน" }),
  ).toBeVisible();
  await expect(page.getByLabel("ชื่อที่แสดง")).toBeVisible();
  await expect(page.getByLabel("ฉันเป็น")).toBeVisible();

  // Switch back to login
  await page.getByRole("button", { name: "มีบัญชีแล้ว? เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: "ยินดีต้อนรับกลับมา" }),
  ).toBeVisible();
});
