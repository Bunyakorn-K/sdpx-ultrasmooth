import type { Page, Locator } from "@playwright/test";

export class AssignmentPage {
  readonly cards: Locator;
  readonly groups: Locator;
  readonly dialog: Locator;
  readonly resultScores: Locator;
  readonly voteQuestions: Locator;
  readonly createButton: Locator;
  readonly startButton: Locator;
  readonly stopButton: Locator;
  readonly submitVote: Locator;
  readonly votedButton: Locator;
  readonly exportButton: Locator;
  constructor(private readonly page: Page) {
    this.cards = page.getByTestId("assignment-card");
    this.groups = page.getByTestId("group-card");
    this.dialog = page.getByRole("dialog");
    this.resultScores = page.getByTestId("result-score");
    this.voteQuestions = page.getByTestId("vote-question");
    this.createButton = page.getByRole("button", {
      name: "สร้าง assignment",
      exact: true,
    });
    this.startButton = page.getByRole("button", {
      name: "เริ่มโหวต",
      exact: true,
    });
    this.stopButton = page.getByRole("button", { name: "หยุดโหวตและรวมคะแนน" });
    this.submitVote = page.getByRole("button", { name: "ยืนยันส่งคะแนน" });
    this.votedButton = page.getByRole("button", { name: "ประเมินแล้ว" });
    this.exportButton = page
      .getByRole("button", { name: "ส่งออก Excel" })
      .first();
  }
  async gotoAssignments() {
    const pathname = new URL(this.page.url()).pathname;
    if (pathname !== "/assignments") {
      await this.page.getByRole("button", { name: /Assignment ของฉัน/ }).click();
      await this.page.waitForURL((u) => u.pathname === "/assignments");
    }
  }
  async openAssignment(title: string) {
    await this.gotoAssignments();
    await this.cards
      .filter({ hasText: title })
      .getByRole("button", { name: "ดูรายละเอียด" })
      .click();
  }
  async switchRole(role: "teacher" | "student") {
    await this.page
      .getByRole("button", {
        name: role === "teacher" ? "สลับเป็นครู" : "สลับเป็นนักเรียน",
      })
      .click();
  }
  async selectTab(name: string) {
    await this.page.getByRole("tab", { name, exact: true }).click();
  }
  async beginVoting() {
    await this.startButton.click();
  }
  async stopVoting() {
    await this.stopButton.click();
  }
  async evaluateGroup(scores: number[]) {
    await this.page.getByRole("button", { name: "เริ่มประเมิน" }).click();
    const count = await this.voteQuestions.count();
    for (let i = 0; i < count; i++) {
      const score = scores[i] ?? scores[0];
      await this.voteQuestions
        .nth(i)
        .locator("label")
        .nth(score - 1)
        .click();
    }
    await this.submitVote.click();
  }
  async evaluateTarget(targetName: string, scores: number[]) {
    const card = this.groups.filter({ hasText: targetName });
    await card.getByRole("button", { name: "เริ่มประเมิน" }).click();
    const count = await this.voteQuestions.count();
    for (let i = 0; i < count; i++) {
      const score = scores[i] ?? scores[0];
      await this.voteQuestions
        .nth(i)
        .locator("label")
        .nth(score - 1)
        .click();
    }
    await this.submitVote.click();
  }
  async viewGroupVotes(groupName: string) {
    const card = this.groups.filter({ hasText: groupName });
    await card.getByRole("link", { name: "ดูการโหวตของสมาชิก" }).click();
  }
  async createWork(title: string, subject: string, deadline: string) {
    await this.gotoAssignments();
    await this.createButton.click();
    await this.dialog.getByLabel("ชื่อ assignment").fill(title);
    await this.dialog.getByLabel("วิชา / หัวข้อ").fill(subject);
    await this.dialog.getByLabel("วันและเวลาสิ้นสุด").fill(deadline);
  }
  async createGroup(name: string) {
    await this.page
      .getByRole("button", { name: "สร้างกลุ่ม", exact: true })
      .click();
    await this.page.getByLabel("ชื่อกลุ่ม").fill(name);
    await this.page.getByRole("button", { name: "บันทึก", exact: true }).click();
  }
  async joinExistingGroup() {
    await this.page.getByRole("button", { name: "เข้าร่วมกลุ่มนี้" }).click();
  }
}
