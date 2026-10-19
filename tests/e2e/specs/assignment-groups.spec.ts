import { test, expect } from "@playwright/test";

test("AC-GROUP-01 / AC-VOTE-01 / AC-RESULT-01: assignment groups, voting, and private results", async ({ page }) => {
  test.setTimeout(60_000);
  const suffix = crypto.randomUUID();
  const api = page.request;
  const signIn = async (name: string) => {
    const response = await api.post("/api/auth/dev-sign-in", { data: { email: `${name}-${suffix}@example.com` } });
    expect(response.status()).toBe(200);
  };
  await signIn("teacher");
  const classResponse = await api.post("/api/classrooms", { data: { name: "Assignment group test" } });
  expect(classResponse.status()).toBe(201);
  const classroom = await classResponse.json();
  const create = await api.post(`/api/classrooms/${classroom.id}/assignments`, { data: { name: "Group submissions" } });
  expect(create.status()).toBe(201);
  const assignment = await create.json();

  // Seed membership using the existing teacher-owned roster boundary.
  const csv = ["email,group_name", ...Array.from({ length: 6 }, (_, i) =>
    `student-${i}-${suffix}@example.com,Imported ${Math.floor(i / 2) + 1}`)].join("\n");
  const imported = await api.post(`/api/classrooms/${classroom.id}/roster/import`, {
    multipart: { file: { name: "roster.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } },
  });
  expect(imported.ok()).toBeTruthy();

  for (let i = 0; i < 3; i++) {
    await signIn(`student-${i}`);
    const group = await api.post(`/api/assignments/${assignment.id}/groups`, {
      data: { name: `Assignment group ${i}`, description: "Our synthetic group answer" },
    });
    expect(group.status()).toBe(201);
  }
  await page.goto(`/classrooms/${classroom.id}/assignments/${assignment.id}/groups`);
  await expect(page.getByRole("heading", { name: "Choose your group" })).toBeVisible();
  await expect(page.getByText("Your group", { exact: true })).toBeVisible();
  expect((await api.get(`/api/assignments/${assignment.id}/scores`)).status()).toBe(404);
  expect((await api.get(`/api/assignments/${assignment.id}/my-report`)).status()).toBe(404);
  expect((await api.post("/api/assignments/2147483647/groups", { data: { name: "Invalid" } })).status()).toBe(404);

  await signIn("teacher");
  expect((await api.post(`/api/assignments/${assignment.id}/publish`)).status()).toBe(422);
  const question = await (await api.post(`/api/assignments/${assignment.id}/questions`, { data: { text: "How clear is the answer?" } })).json();
  expect((await api.post(`/api/assignments/${assignment.id}/publish`)).ok()).toBeTruthy();
  expect((await api.get(`/api/assignments/${assignment.id}/scores`)).status()).toBe(200);
  await signIn("student-0");
  const sheet = await (await api.get(`/api/assignments/${assignment.id}/ratings`)).json();
  expect(sheet.groups).toHaveLength(2);
  expect(sheet.groups.map((group: { id: number }) => group.id)).not.toContain(sheet.myGroupId);
  const target = sheet.groups[0].id;
  const rate = (groupId: number, score: number) => api.put(`/api/assignments/${assignment.id}/ratings`, {
    data: { questionId: question.id, groupId, score },
  });
  expect((await rate(target, 4)).status()).toBe(200);
  expect((await rate(target, 5)).status()).toBe(200);
  expect((await (await api.get(`/api/assignments/${assignment.id}/ratings`)).json()).ratings)
    .toEqual([{ questionId: question.id, groupId: target, score: 5 }]);
  expect((await rate(sheet.myGroupId, 5)).status()).toBe(403);
  expect((await rate(target, 6)).status()).toBe(403);
  expect((await api.post(`/api/assignments/${assignment.id}/groups`, { data: { name: "Late group" } })).status()).toBe(409);
});
