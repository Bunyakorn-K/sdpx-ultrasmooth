import { expect, test } from "@playwright/test";

test("visitor can see the PairEval homepage", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Fairer student evaluation through pairwise comparison",
    }),
  ).toBeVisible();
  await expect(page.getByText("University Evaluation System")).toBeVisible();
});
