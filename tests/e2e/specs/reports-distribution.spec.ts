import { test, expect } from "../fixtures";
import { HomePage } from "../pages/HomePage";
import { AssignmentPage } from "../pages/AssignmentPage";
import { seed, demoTeacher } from "@/features/assignments/data/demo-data";
import { previewRegeneration } from "@/features/pairwise/domain/regeneration";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import type { Assignment } from "@/features/assignments/types";
import type { Comparison } from "@/features/pairwise/types";

// FR-REPORT-05 on the panel that serves real generated pairs: once an
// assignment has persisted pairs, the teacher's reports come from
// GeneratedReportsPanel, so the distribution chart has to exist there rather
// than only on the reconstructed demo panel.
//
// Comparisons are seeded directly with known choices per criterion, because the
// chart counts submitted answers and there is no shortcut through the UI.
const CHOSEN: Record<string, Comparison["choice"][]> = {
  "GROUP-0": [1, 1, 4],
  "GROUP-1": [3, 5],
  "GROUP-2": [6, 6, 6],
};

function publishedAssignment(): Assignment[] {
  const data = seed();
  const assignment = data[0];
  assignment.groups.push({
    id: "g3",
    name: "Third Group",
    members: [7, 8, 9].map((n) => ({ id: `s${n}`, name: `Student ${n}` })),
  });
  assignment.students = assignment.groups.flatMap((g) => g.members);
  assignment.targetCoverage = 3;
  const plan = previewRegeneration(assignment, "both");
  applyAssignmentCommand(assignment, demoTeacher, "regeneratePairs", {
    scope: "both",
    reason: "Distribution chart fixture",
    expectedGeneration: 0,
    previewToken: plan.token,
  });

  const comparisons: Comparison[] = [];
  for (const [criterionId, choices] of Object.entries(CHOSEN)) {
    const pairs = (assignment.pairs ?? [])
      .filter((pair) => pair.criterion_id === criterionId)
      .slice(0, choices.length);
    expect(
      pairs.length,
      `fixture needs ${choices.length} pairs for ${criterionId}`,
    ).toBe(choices.length);
    pairs.forEach((pair, index) =>
      comparisons.push({
        id: `seed-${pair.id}`,
        pair_assignment_id: pair.id,
        evaluator_user_id: pair.evaluator_user_id,
        choice: choices[index],
        status: "SUBMITTED",
        saved_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      }),
    );
  }
  assignment.comparisons = comparisons;
  return data;
}

test("FR-REPORT-05: the teacher's distribution tab charts each criterion's spread over the six-point scale", async ({
  page,
}) => {
  const data = publishedAssignment();
  await page.addInitScript((items: unknown) => {
    localStorage.setItem("pair-eval-demo", JSON.stringify(items));
  }, data);

  const home = new HomePage(page);
  const assignment = new AssignmentPage(page);
  await home.goto();
  await home.exploreDemo();
  await assignment.openAssignment(data[0].title);
  await assignment.selectTab("ผลการประเมิน");

  // The generated panel owns this assignment, and the chart is a tab on it.
  const chartTab = page.getByRole("tab", {
    name: "การกระจายคะแนน",
    exact: true,
  });
  await expect(chartTab).toBeVisible();
  await chartTab.click();

  const criteria = data[0].questions;
  for (const [index, criterion] of criteria.entries()) {
    const choices = CHOSEN[`GROUP-${index}`];
    const counts = new Map<number, number>();
    for (const choice of choices)
      counts.set(choice, (counts.get(choice) ?? 0) + 1);

    // Regenerating both sides yields a GROUP and an INDIVIDUAL chart per
    // question, so the side is part of the accessible name.
    const chart = page.getByRole("img", {
      name: `การกระจายคะแนน ${criterion} (GROUP)`,
    });
    await expect(chart).toBeVisible();
    await expect(chart.getByTestId("distribution-bar")).toHaveCount(6);
    // The total is the chart's heading, not part of the chart element itself.
    await expect(
      page.getByText(`${criterion} · ${choices.length} การเปรียบเทียบ`),
    ).toBeVisible();
    for (const choice of [1, 2, 3, 4, 5, 6]) {
      await expect(
        chart.getByLabel(
          `ตัวเลือก ${choice} · ${counts.get(choice) ?? 0} ครั้ง`,
        ),
      ).toBeVisible();
    }
  }
});
