import { expect, test } from "@playwright/test";

test("teacher deletes draft groups with confirmation; enrollment, scope, and published votes remain safe", async ({ page }) => {
  test.setTimeout(60_000);
  const api = page.request;
  const suffix = crypto.randomUUID();
  const signIn = async (name: string, role?: "student") => {
    expect((await api.post("/api/auth/dev-sign-in", { data: { email: `${name}-${suffix}@example.com`, role } })).status()).toBe(200);
  };
  await signIn("teacher");
  const assignment = await (await api.post("/api/assignments", { data: { name: "Draft groups" } })).json();
  const other = await (await api.post("/api/assignments", { data: { name: "Other assignment" } })).json();
  const endpoint = `/api/assignments/${assignment.id}/groups`;
  const otherGroup = await (await api.post(`/api/assignments/${other.id}/groups`, { data: { name: "Keep answer" } })).json();
  expect((await api.delete(endpoint, { data: { groupId: otherGroup.groupId } })).status()).toBe(404);
  expect((await api.delete(endpoint, { data: { groupId: "invalid" } })).status()).toBe(400);
  for (let i = 0; i < 3; i++) {
    await signIn(`student-${i}`, "student");
    expect((await api.post("/api/classrooms/join", { data: { code: assignment.joinCode } })).status()).toBe(201);
  }
  await signIn("student-0");
  const target = await (await api.post(endpoint, { data: { name: "Remove this group" } })).json();
  expect((await api.delete(endpoint, { data: { groupId: target.groupId } })).status()).toBe(404);
  await page.goto(`/classrooms/${assignment.classroomId}/assignments/${assignment.id}/groups`);
  await expect(page.getByRole("button", { name: /^Delete group/ })).toHaveCount(0);
  await signIn("outsider");
  expect((await api.delete(endpoint, { data: { groupId: target.groupId } })).status()).toBe(404);
  await signIn("teacher");
  await page.goto(`/classrooms/${assignment.classroomId}/assignments/${assignment.id}`);
  const button = page.getByRole("button", { name: "Delete group Remove this group", exact: true });
  page.once("dialog", (dialog) => dialog.dismiss());
  await button.click();
  await expect(button).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await button.click();
  await expect(button).toHaveCount(0);
  await signIn("student-0");
  const after = await (await api.get(endpoint)).json();
  expect(after.myGroupId).toBeNull();
  expect(after.groups).toHaveLength(0);
  let survivingGroupId = 0;
  for (let i = 0; i < 3; i++) {
    await signIn(`student-${i}`);
    const response = await api.post(endpoint, { data: { name: `Answer ${i}` } });
    expect(response.status()).toBe(201);
    survivingGroupId = (await response.json()).groupId;
  }
  await signIn("teacher");
  expect((await api.post(`/api/assignments/${assignment.id}/questions`, { data: { text: "Overall quality" } })).status()).toBe(201);
  expect((await api.post(`/api/assignments/${assignment.id}/publish`)).ok()).toBeTruthy();
  expect((await api.delete(endpoint, { data: { groupId: survivingGroupId } })).status()).toBe(409);
  await page.reload();
  await expect(page.getByRole("button", { name: /^Delete group/ })).toHaveCount(0);
  expect((await (await api.get(endpoint)).json()).groups).toHaveLength(3);
  expect((await (await api.get(`/api/assignments/${other.id}/groups`)).json()).groups).toHaveLength(1);
  await api.post("/api/auth/sign-out");
  expect((await api.delete(endpoint, { data: { groupId: survivingGroupId } })).status()).toBe(401);
});
