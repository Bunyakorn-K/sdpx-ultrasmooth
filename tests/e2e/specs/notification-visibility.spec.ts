import { test, expect } from "../fixtures";
import { HomePage } from "../pages/HomePage";

test("the bell remains visible in the mobile demo header without calling the private inbox", async ({
  page,
}) => {
  let requests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/notifications") requests++;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const home = new HomePage(page);
  await home.goto();
  await home.exploreDemo();
  const bell = page
    .locator("header.app-topbar")
    .getByRole("button", { name: "Notifications", exact: true });
  await expect(bell).toBeVisible();
  expect(
    await bell.evaluate((element) => element.getBoundingClientRect().right),
  ).toBeLessThanOrEqual(390);
  await bell.click();
  await expect(
    page.getByText(/Demo mode does not store notifications/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Read all", exact: true }),
  ).toBeDisabled();
  expect(requests).toBe(0);
});

test("a signed-in teacher sees the bell with a clear student-only explanation", async ({
  page,
  users,
  baseURL,
}) => {
  test.skip(
    process.env.E2E_DATABASE_ENABLED !== "1",
    "Requires the isolated test database.",
  );
  expect(
    (
      await page.request.post("/api/auth/login", {
        headers: { origin: new URL(baseURL!).origin },
        data: { email: users.teacher.email, password: users.teacher.password },
      })
    ).status(),
  ).toBe(200);
  let requests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/notifications") requests++;
  });
  await page.goto("/classrooms");
  const bell = page
    .locator("header.app-topbar")
    .getByRole("button", { name: "Notifications", exact: true });
  await expect(bell).toBeVisible();
  await bell.click();
  await expect(
    page.getByText(/Notifications currently notify students/),
  ).toBeVisible();
  expect(requests).toBe(0);
});
