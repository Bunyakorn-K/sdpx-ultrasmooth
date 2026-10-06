import { expect, test } from "@playwright/test";

const demoRoutes = [
  { path: "/login", heading: "Sign in to PairEval", title: "Login — PairEval" },
  { path: "/classroom/new", heading: "Step 1: Setup Classroom & Roster", title: "Create Classroom — PairEval" },
  { path: "/assignments/new", heading: "Step 2: Create Assignment", title: "Create Assignment — PairEval" },
  { path: "/scores", heading: "Step 3: Evaluation Results", title: "Scores — PairEval" },
];

for (const { path, heading, title } of demoRoutes) {
  test(`${path} remains available after the App Router migration`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page).toHaveTitle(title);
  });
}
