import { test, expect, type Locator, type Page } from "@playwright/test";
import { HomePage } from "../pages/HomePage";

async function typography(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { family: style.fontFamily, size: style.fontSize };
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
}

for (const width of [1280, 390]) {
  test(`shared theme stays consistent across public and workspace pages at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    const loginHeading = await typography(page.locator("#auth-title"));
    const loginButton = await typography(
      page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }),
    );
    await expectNoHorizontalOverflow(page);
    await page.goto("/register");
    expect(await typography(page.locator("#auth-title"))).toEqual(loginHeading);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `tests/artifacts/theme-register-${width}.png`,
      fullPage: true,
    });

    const home = new HomePage(page);
    await home.goto();
    await expect(home.title).toBeVisible();
    expect((await typography(home.title)).family).toBe(loginHeading.family);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `tests/artifacts/theme-home-${width}.png`,
      fullPage: true,
    });
    await home.exploreDemo();
    await page.goto("/assignments");
    const assignmentHeading = page.getByRole("heading", {
      name: "Assignment ของฉัน.",
    });
    await expect(assignmentHeading).toBeVisible();
    expect(await typography(assignmentHeading)).toEqual(loginHeading);
    expect(
      await typography(
        page.getByRole("button", { name: "สร้าง assignment", exact: true }),
      ),
    ).toEqual(loginButton);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `tests/artifacts/theme-assignments-${width}.png`,
      fullPage: true,
    });

    await page
      .getByTestId("assignment-card")
      .first()
      .getByRole("button", { name: "ดูรายละเอียด" })
      .click();
    await expect(page.locator(".detail-heading h1")).toBeVisible();
    expect(await typography(page.locator(".detail-heading h1"))).toEqual(
      loginHeading,
    );
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `tests/artifacts/theme-detail-${width}.png`,
      fullPage: true,
    });
    await page.goto("/classrooms");
    await expect(
      page.getByRole("heading", { name: "ห้องเรียนของฉัน (Classrooms)" }),
    ).toBeVisible();
    expect(
      (
        await typography(
          page.getByRole("heading", { name: "ห้องเรียนของฉัน (Classrooms)" }),
        )
      ).family,
    ).toBe(loginHeading.family);
    expect(
      await typography(page.getByTestId("create-classroom-button")),
    ).toEqual(loginButton);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `tests/artifacts/theme-classrooms-${width}.png`,
      fullPage: true,
    });
  });
}
