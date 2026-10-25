import { test, expect } from "../fixtures";
import { readFileSync } from "node:fs";
import type { Classroom } from "@/features/classroom/types";
import type { Assignment } from "@/features/assignments/types";
import { randomBytes } from "node:crypto";
import { HomePage } from "../pages/HomePage";

test("teacher downloads KMITL roster, previews, imports and updates a student's group", async ({
  page,
}) => {
  const home = new HomePage(page);
  await home.goto();
  await home.exploreDemo();
  await page.getByRole("button", { name: "ห้องเรียนของฉัน" }).click();
  await page.getByTestId("create-classroom-button").click();
  await page.getByLabel("ชื่อห้องเรียน (Classroom Name)").fill("CSV classroom");
  await page
    .getByRole("button", { name: "สร้าง Classroom", exact: true })
    .click();
  await page
    .getByTestId("classroom-card")
    .filter({ hasText: "CSV classroom" })
    .getByRole("link", { name: "เข้าสู่ห้องเรียน" })
    .click();
  await page
    .getByRole("button", { name: "นำเข้ารายชื่อ (CSV)", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.getByRole("link", { name: /ดาวน์โหลด CSV ตัวอย่าง/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("student-roster.csv");
  const file = dialog.getByLabel("ไฟล์รายชื่อนักศึกษา CSV");
  await file.setInputFiles("public/templates/student-roster.csv");
  await expect(
    dialog.getByText("s12@kmitl.ac.th", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("67015012", { exact: true })).toBeVisible();
  await expect(
    dialog.getByText("เพิ่มนักศึกษาใหม่", { exact: true }),
  ).toHaveCount(12);
  await dialog
    .getByRole("button", { name: "ยืนยันนำเข้าข้อมูล (12 คน)", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page.getByRole("tab", { name: /นักศึกษาและกลุ่ม/ }).click();
  await expect(
    page.getByText("s12@kmitl.ac.th", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "นำเข้า / อัปเดต CSV", exact: true })
    .click();
  await file.setInputFiles({
    name: "update.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      'email,group_name,student_id,display_name\ns1@kmitl.ac.th,Group 2,67015001,"ชื่อ, ใหม่"',
    ),
  });
  await expect(
    dialog.getByText("ย้ายกลุ่ม: Group 1 → Group 2", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("ชื่อ, ใหม่", { exact: true })).toBeVisible();
  await dialog
    .getByRole("button", { name: "ยืนยันนำเข้าข้อมูล (1 คน)", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("row").filter({ hasText: "s1@kmitl.ac.th" }),
  ).toContainText("Group 2");
  await page
    .getByRole("button", { name: "นำเข้า / อัปเดต CSV", exact: true })
    .click();
  await file.setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "email,group_name\ns13@kmitl.ac.th,Group 4\ninvalid,Group 4",
    ),
  });
  await expect(dialog.getByRole("alert")).toContainText("แถวที่ 3");
  await expect(
    dialog.getByRole("button", { name: /ยืนยันนำเข้าข้อมูล/ }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "ยกเลิก", exact: true }).click();
  await expect(page.getByText("s13@kmitl.ac.th", { exact: true })).toHaveCount(
    0,
  );
});

test("PostgreSQL CSV drives all assignments and a pending student can register after publication", async ({
  playwright,
  baseURL,
  users,
  page,
}) => {
  test.skip(
    process.env.E2E_DATABASE_ENABLED !== "1",
    "Requires isolated test database",
  );
  const owner = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: new URL(baseURL!).origin },
  });
  const student = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: new URL(baseURL!).origin },
  });
  const email = `s1-${users.runId}@e2e.invalid`;
  const password = randomBytes(24).toString("base64url");
  try {
    expect(
      (
        await owner.post("/api/auth/login", {
          data: {
            email: users.teacher.email,
            password: users.teacher.password,
          },
        })
      ).status(),
    ).toBe(200);
    const created = await owner.post("/api/classrooms", {
      data: { name: "CSV roster flow", slug: `flow-${users.runId}` },
    });
    expect(created.status()).toBe(201);
    const classroom = (await created.json()).classroom as Classroom;
    const csv = readFileSync(
      "public/templates/student-roster.csv",
      "utf8",
    ).replaceAll("@kmitl.ac.th", `-${users.runId}@e2e.invalid`);
    const imported = await owner.post(
      `/api/classrooms/${classroom.id}/roster/import`,
      { data: { csv } },
    );
    expect(imported.status()).toBe(200);
    const roster = (await imported.json()).classroom as Classroom;
    const member = roster.members.find((m) => m.email === email)!;
    expect(member.status).toBe("PENDING");
    const assignments: Assignment[] = [];
    for (const title of ["First CSV assignment", "Second CSV assignment"]) {
      const response = await owner.post("/api/assignments", {
        data: {
          title,
          classroomId: classroom.id,
          deadline: new Date(Date.now() + 86400000).toISOString(),
          questions: ["Quality"],
        },
      });
      expect(response.status()).toBe(201);
      const a = (await response.json()).assignment as Assignment;
      expect(a).not.toHaveProperty("code");
      expect(a.classroomRosterManaged).toBe(true);
      expect(a.students).toHaveLength(12);
      expect(a.groups.map((g) => g.members.length)).toEqual([4, 4, 4]);
      expect(a.groups[0].members[0].id).toBe(member.user_id);
      assignments.push(a);
    }
    const a = assignments[0];
    expect(
      (
        await owner.post("/api/assignments/join", { data: { code: "123456" } })
      ).status(),
    ).toBe(405); // Retired path matches the read-only /assignments/[id] route.
    const unchangedAssignment = await owner.get(`/api/assignments/${a.id}`);
    expect((await unchangedAssignment.json()).assignment.students).toHaveLength(
      12,
    );
    const preview = await owner.post(`/api/assignments/${a.id}/pairs/preview`, {
      data: { scope: "both" },
    });
    expect(preview.status()).toBe(200);
    const plan = (await preview.json()).preview;
    const published = await owner.post(
      `/api/assignments/${a.id}/voting/start`,
      { data: { expectedGeneration: 0, previewToken: plan.token } },
    );
    expect(published.status()).toBe(200);
    const pendingLogin = await student.post("/api/auth/login", {
      data: { email, password },
    });
    expect(pendingLogin.status()).toBe(401);
    const wrongRole = await student.post("/api/auth/register", {
      data: { email, password, name: "Teacher attempt", role: "teacher" },
    });
    expect(wrongRole.status()).toBe(409);
    const registered = await student.post("/api/auth/register", {
      data: { email, password, name: "CSV Student", role: "student" },
    });
    expect(registered.status()).toBe(201);
    const user = (await registered.json()).user;
    expect(user.id).toBe(member.user_id);
    users.createdUserIds.push(user.id);
    const joined = await student.get("/api/classrooms");
    expect(joined.status()).toBe(200);
    expect(
      (await joined.json()).classrooms
        .find((c: Classroom) => c.id === classroom.id)
        .members.find((m: { email: string }) => m.email === email).status,
    ).toBe("ACTIVE");
    const current = await student.get(`/api/assignments/${a.id}`);
    expect(current.status()).toBe(200);
    const own = (await current.json()).assignment as Assignment;
    expect(own.pairs!.filter((p) => p.side === "GROUP")).toHaveLength(1);
    expect(own.pairs!.every((p) => p.evaluator_user_id === user.id)).toBe(true);
    const submitted = await student.post(
      `/api/assignments/${a.id}/submissions`,
      {
        data: {
          side: "GROUP",
          expectedGeneration: own.pairGeneration,
          expectedRevision: 0,
          answers: own
            .pairs!.filter((p) => p.side === "GROUP")
            .map((p) => ({ pairId: p.id, choice: 6, timeOnTaskMs: 5000 })),
        },
      },
    );
    expect(submitted.status()).toBe(200);
    expect((await submitted.json()).assignment.comparisons).toHaveLength(1);
    expect(
      (
        await student.post(`/api/assignments/${assignments[1].id}/groups`, {
          data: { name: "Other" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await student.post(
          `/api/assignments/${assignments[1].id}/groups/join`,
          { data: { groupId: a.groups[1].id } },
        )
      ).status(),
    ).toBe(403);
    expect(
      (
        await student.post("/api/auth/register", {
          data: { email, password, name: "Overwrite", role: "student" },
        })
      ).status(),
    ).toBe(409);
    await page
      .context()
      .addCookies(await student.storageState().then((s) => s.cookies));
    await page.goto(`/assignments/${assignments[1].id}`);
    await expect(
      page.getByText("รหัส Assignment", { exact: false }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "เข้าร่วม assignment", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/กลุ่มถูกกำหนดโดยอาจารย์จาก CSV/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "สร้างกลุ่ม", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "เข้าร่วมกลุ่มนี้", exact: true }),
    ).toHaveCount(0);
    const updated = await owner.post(
      `/api/classrooms/${classroom.id}/roster/import`,
      { data: { csv: `email,group_name\n${email},Group 2` } },
    );
    expect(updated.status()).toBe(200);
    const draft = (
      await (await owner.get(`/api/assignments/${assignments[1].id}`)).json()
    ).assignment as Assignment;
    expect(draft.groups.map((g) => g.members.length)).toEqual([3, 5, 4]);
    const frozen = (await (await owner.get(`/api/assignments/${a.id}`)).json())
      .assignment as Assignment;
    expect(frozen.groups.map((g) => g.members.length)).toEqual([4, 4, 4]);
  } finally {
    await owner.dispose();
    await student.dispose();
  }
});

test("PostgreSQL roster import is atomic, authorized and preserves names on upsert", async ({
  playwright,
  baseURL,
  users,
}) => {
  test.skip(
    process.env.E2E_DATABASE_ENABLED !== "1",
    "Requires isolated test database",
  );
  const owner = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: new URL(baseURL!).origin },
  });
  const outsider = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: new URL(baseURL!).origin },
  });
  try {
    for (const [context, account] of [
      [owner, users.teacher],
      [outsider, users.student],
    ] as const) {
      const login = await context.post("/api/auth/login", {
        data: { email: account.email, password: account.password },
      });
      expect(login.status()).toBe(200);
    }
    const created = await owner.post("/api/classrooms", {
      data: { name: "KMITL CSV", slug: `csv-${users.runId}` },
    });
    expect(created.status()).toBe(201);
    const classroom = (await created.json()).classroom as Classroom;
    const path = `/api/classrooms/${classroom.id}/roster/import`;
    const csv = readFileSync("public/templates/student-roster.csv", "utf8");
    expect((await outsider.post(path, { data: { csv } })).status()).toBe(403);
    const imported = await owner.post(path, { data: { csv } });
    expect(imported.status()).toBe(200);
    const result = await imported.json();
    expect(result.addedCount).toBe(12);
    expect(result.classroom.groups).toHaveLength(3);
    expect(
      result.classroom.members.filter(
        (m: { role: string }) => m.role === "STUDENT",
      ),
    ).toHaveLength(12);
    const invalid = await owner.post(path, {
      data: {
        csv: "email,group_name\ns13@kmitl.ac.th,Group 4\ninvalid,Group 4",
      },
    });
    expect(invalid.status()).toBe(400);
    expect(await invalid.text()).toContain("แถวที่ 3");
    const unchanged = await owner.get(`/api/classrooms/${classroom.id}`);
    expect((await unchanged.json()).classroom).toEqual(result.classroom);
    const updated = await owner.post(path, {
      data: {
        csv: 'email,group_name,student_id,display_name\ns1@kmitl.ac.th,Group 2,67015001,"ชื่อ, ""ใหม่"""',
      },
    });
    expect(updated.status()).toBe(200);
    const next = await updated.json();
    expect(next.addedCount).toBe(0);
    expect(next.updatedCount).toBe(1);
    const member = next.classroom.members.find(
      (m: { email: string }) => m.email === "s1@kmitl.ac.th",
    );
    expect(member.display_name).toBe('ชื่อ, "ใหม่"');
    expect(member.student_id).toBe("67015001");
    expect(member.group_id).toBe(
      next.classroom.groups.find((g: { name: string }) => g.name === "Group 2")
        .id,
    );
    expect(next.classroom.members).toHaveLength(13);
  } finally {
    await owner.dispose();
    await outsider.dispose();
  }
});
