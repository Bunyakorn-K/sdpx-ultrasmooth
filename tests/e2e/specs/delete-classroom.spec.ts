import { expect, test } from "@playwright/test";

test("only the owner can confirm deletion of a classroom and its voting data", async ({ page }) => {
  test.setTimeout(60_000);
  const api = page.request;
  const suffix = crypto.randomUUID();
  const signIn = async (name: string) => {
    expect((await api.post("/api/auth/dev-sign-in", { data: { email: `${name}-${suffix}@example.com` } })).status()).toBe(200);
  };
  expect((await api.delete("/api/classrooms/2147483647")).status()).toBe(401);
  await signIn("owner");
  const classroom = await (await api.post("/api/classrooms", { data: { name: "Deletion test" } })).json();
  const assignment = await (await api.post(`/api/classrooms/${classroom.id}/assignments`, { data: { name: "Voting data" } })).json();
  const csv = ["email,group_name", ...Array.from({ length: 6 }, (_, i) => `student-${i}-${suffix}@example.com,Team ${Math.floor(i / 2)}`)].join("\n");
  expect((await api.post(`/api/classrooms/${classroom.id}/roster/import`, {
    multipart: { file: { name: "roster.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } },
  })).ok()).toBeTruthy();
  for (let i = 0; i < 3; i++) {
    await signIn(`student-${i}`);
    expect((await api.post(`/api/assignments/${assignment.id}/groups`, { data: { name: `Answer ${i}` } })).status()).toBe(201);
  }
  expect((await api.delete(`/api/classrooms/${classroom.id}`)).status()).toBe(404);
  await page.goto(`/classrooms/${classroom.id}`);
  await expect(page.getByRole("button", { name: "Delete classroom", exact: true })).toHaveCount(0);
  await signIn("outsider");
  const control = await (await api.post("/api/classrooms", { data: { name: "Keep this classroom" } })).json();
  expect((await api.delete(`/api/classrooms/${classroom.id}`)).status()).toBe(404);
  await signIn("owner");
  const question = await (await api.post(`/api/assignments/${assignment.id}/questions`, { data: { text: "Overall quality" } })).json();
  expect((await api.post(`/api/assignments/${assignment.id}/publish`)).ok()).toBeTruthy();
  await signIn("student-0");
  const sheet = await (await api.get(`/api/assignments/${assignment.id}/ratings`)).json();
  expect((await api.put(`/api/assignments/${assignment.id}/ratings`, {
    data: { questionId: question.id, groupId: sheet.groups[0].id, score: 4 },
  })).status()).toBe(200);
  await signIn("owner");
  await page.goto(`/classrooms/${classroom.id}`);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Delete classroom", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Deletion test" })).toBeVisible();
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain("permanently deleted");
    return dialog.accept();
  });
  await page.getByRole("button", { name: "Delete classroom", exact: true }).click();
  await expect(page).toHaveURL(/\/classrooms$/);
  expect((await api.get(`/api/assignments/${assignment.id}/scores`)).status()).toBe(404);
  expect((await api.delete(`/api/classrooms/${classroom.id}`)).status()).toBe(404);
  await signIn("student-0");
  expect((await api.get("/api/account")).status()).toBe(200);
  expect((await (await api.get("/api/classrooms")).json()).classrooms).toHaveLength(0);
  await signIn("outsider");
  expect((await (await api.get("/api/classrooms")).json()).classrooms).toContainEqual(expect.objectContaining({ id: control.id }));
  expect((await api.delete(`/api/classrooms/${control.id}`)).status()).toBe(204);
});
