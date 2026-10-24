import { test, expect } from "../fixtures";
import { HomePage } from "../pages/HomePage";
import { AssignmentPage } from "../pages/AssignmentPage";

for (const timezoneId of ["Asia/Bangkok", "America/Los_Angeles"]) {
  test.describe(`Teacher deadline in ${timezoneId}`, () => {
    test.use({ timezoneId });
    test("rejects past dates and times, advances the minimum, and accepts future work", async ({
      page,
    }) => {
      await page.clock.install({ time: new Date("2028-01-15T10:30:20Z") });
      const home = new HomePage(page);
      const assignment = new AssignmentPage(page);
      await home.goto();
      await home.exploreDemo();
      await assignment.gotoAssignments();
      await assignment.createButton.click();
      await assignment.dialog
        .getByLabel("ชื่อ assignment")
        .fill("Future deadline check");
      await assignment.dialog.getByLabel("วิชา / หัวข้อ").fill("Testing");
      const deadline = assignment.dialog.getByLabel("วันและเวลาสิ้นสุด");
      const localTime = timezoneId === "Asia/Bangkok" ? "17:30" : "02:30";
      await expect(deadline).toHaveAttribute(
        "min",
        `2028-01-15T${localTime.slice(0, 3)}31`,
      );
      const submit = assignment.dialog.getByRole("button", {
        name: "สร้าง assignment",
        exact: true,
      });
      for (const past of ["2028-01-14T23:59", `2028-01-15T${localTime}`]) {
        await deadline.fill(past);
        await submit.click();
        await expect(assignment.dialog).toBeVisible();
        expect(
          await deadline.evaluate(
            (input: HTMLInputElement) => input.validity.rangeUnderflow,
          ),
        ).toBe(true);
      }
      await page.clock.runFor(60_000);
      await expect(deadline).toHaveAttribute(
        "min",
        `2028-01-15T${localTime.slice(0, 3)}32`,
      );
      await deadline.fill(`2028-01-15T${localTime.slice(0, 3)}31`);
      expect(
        await deadline.evaluate((input: HTMLInputElement) =>
          input.checkValidity(),
        ),
      ).toBe(false);
      await deadline.fill("2028-01-16T12:00");
      await submit.click();
      await expect(
        page.getByRole("heading", {
          name: "Future deadline check",
          exact: true,
        }),
      ).toBeVisible();
    });
  });
}
