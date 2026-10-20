import type { Page, Locator } from "@playwright/test";
import { seed } from "@/features/assignments/data/demo-data";

export class HomePage {
  readonly navigation: Locator;
  readonly mainCta: Locator;
  readonly demoButton: Locator;
  readonly title: Locator;
  readonly audienceCards: Locator;
  constructor(private readonly page: Page) {
    this.navigation = page.getByRole("navigation");
    this.mainCta = page.getByTestId("main-cta");
    this.demoButton = page.getByRole("button", { name: "ลองใช้งานตัวอย่าง" });
    this.title = page.getByRole("heading", {
      name: "ทุกความคิดเห็น สร้างการเรียนรู้ที่ดีกว่า.",
    });
    this.audienceCards = page.getByTestId("audience-card");
  }
  async goto() {
    await this.page.addInitScript((data) => {
      if (!localStorage.getItem("pair-eval-demo")) {
        localStorage.setItem("pair-eval-demo", JSON.stringify(data));
      }
    }, seed());
    await this.page.goto("/");
  }
  async exploreDemo() {
    await this.demoButton.click();
  }
}
