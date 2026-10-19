import { expect, test } from "@playwright/test";

test("local test accounts keep teacher and student permissions across repeated sign-ins", async ({ page }) => {
  const api = page.request;
  expect((await api.post("/api/auth/dev-sign-in", { data: { demoRole: "admin" } })).status()).toBe(400);
  await page.goto("/sign-in");
  const teacherButton = page.getByRole("button", { name: "Use Teacher", exact: true });
  await expect(teacherButton).toBeEnabled();
  await teacherButton.click();
  await expect(page).toHaveURL(/\/classrooms$/);
  expect((await (await api.get("/api/account")).json()).user.role).toBe("teacher");
  await api.post("/api/auth/sign-out");
  await page.goto("/sign-in");
  const studentButton = page.getByRole("button", { name: "Use Student", exact: true });
  await expect(studentButton).toBeEnabled();
  await studentButton.click();
  await expect(page).toHaveURL(/\/classrooms$/);
  expect((await (await api.get("/api/account")).json()).user.role).toBe("student");
  expect((await api.post("/api/assignments", { data: { name: "Forbidden" } })).status()).toBe(403);
  expect((await api.post("/api/auth/dev-sign-in", { data: { demoRole: "teacher" } })).status()).toBe(200);
  expect((await (await api.get("/api/account")).json()).user.role).toBe("teacher");
  const email = `seeded-${crypto.randomUUID()}@example.com`;
  expect((await api.post("/api/auth/dev-sign-in", { data: { email, role: "student" } })).status()).toBe(200);
  expect((await (await api.get("/api/account")).json()).user.role).toBe("student");
});
