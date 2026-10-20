import { appendFile, readFile } from "node:fs/promises";
if (process.env.GITHUB_STEP_SUMMARY) {
  let text = "## Unit tests and coverage\n\n";
  try {
    const { total } = JSON.parse(
      await readFile("coverage/coverage-summary.json", "utf8"),
    );
    text += `| Metric | Coverage |\n| --- | --- |\n| Lines | ${total.lines.pct}% |\n| Branches | ${total.branches.pct}% |\n| Functions | ${total.functions.pct}% |\n`;
  } catch {
    text += "Coverage report was not generated. Inspect the failed step.\n";
  }
  await appendFile(process.env.GITHUB_STEP_SUMMARY, text);
}
