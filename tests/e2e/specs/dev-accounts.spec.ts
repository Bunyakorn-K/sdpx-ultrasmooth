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
  const teacherClasses = await (await api.get("/api/classrooms")).json();
  const classroom = teacherClasses.classrooms.find((entry: { slug: string }) => entry.slug === "paireval-dev");
  expect(classroom.role).toBe("INSTRUCTOR");
  await api.post("/api/auth/sign-out");
  await page.goto("/sign-in");
  const studentButton = page.getByRole("button", { name: "Use Student", exact: true });
  await expect(studentButton).toBeEnabled();
  await studentButton.click();
  await expect(page).toHaveURL(/\/classrooms$/);
  expect((await (await api.get("/api/account")).json()).user.role).toBe("student");
  expect((await api.post("/api/classrooms", { data: { name: "Forbidden" } })).status()).toBe(403);
  const studentClasses = await (await api.get("/api/classrooms")).json();
  expect(studentClasses.classrooms).toContainEqual(expect.objectContaining({ id: classroom.id, role: "STUDENT" }));
  expect((await api.post("/api/auth/dev-sign-in", { data: { demoRole: "teacher" } })).status()).toBe(200);
  const repeated = await (await api.get("/api/classrooms")).json();
  expect(repeated.classrooms.filter((entry: { id: number }) => entry.id === classroom.id)).toHaveLength(1);
});
