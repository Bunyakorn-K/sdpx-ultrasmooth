import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    repo: { type: "string" },
    reviewers: { type: "string" },
    apply: { type: "boolean", default: false },
  },
});
const repo = values.repo;
if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo))
  throw Error("Provide an explicit GitHub target: --repo OWNER/REPOSITORY");
const [owner] = repo.split("/");
const reviewers = [...new Set((values.reviewers || "").split(",").filter(Boolean))];
if (reviewers.some((login) => !/^[a-z\d-]+$/i.test(login)))
  throw Error("Reviewers must be comma-separated GitHub usernames.");

const backlog = await readFile(new URL("../docs/backlog.md", import.meta.url), "utf8");
const done = backlog.match(/## Definition of Done[^\n]*\n([\s\S]*?)(?=\n## )/)?.[1]?.trim();
const stories = [...backlog.matchAll(/^## (US\d+) — (.+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)]
  .map((match) => ({
    id: match[1],
    title: `[${match[1]}] ${match[2]}`,
    body: `Local backlog ID: ${match[1]}\n\n${match[3].trim()}\n\n## Definition of Done\n\n${done}\n\nSource: docs/backlog.md\n`,
  }));
if (!stories.length || !done) throw Error("Backlog must contain stories and a Definition of Done.");

const plan = {
  repository: repo,
  stories: stories.map(({ id, title }) => ({ id, title })),
  project: "Peerly Backlog",
  labels: ["user-story", "bug", "enhancement", "tech-debt"],
  branches: ["main", "develop"],
  requiredChecks: ["lint-and-unit-test", "e2e-tests", "codeql", "secret-scan"],
  productionReviewers: reviewers,
  deploymentEnabled: false,
};
if (!values.apply) {
  console.log(JSON.stringify(plan, null, 2));
  console.log("Plan only. Add --apply --reviewers USER[,USER] to configure the selected repository.");
  process.exit(0);
}
if (!reviewers.length) throw Error("At least one real production reviewer is required with --apply.");

function gh(args, input, json = true) {
  const result = spawnSync("gh", args, {
    input: input === undefined ? undefined : JSON.stringify(input),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0)
    throw Error(`GitHub operation failed: ${args.slice(0, 3).join(" ")}. Check gh authentication, repository permissions and project scope. No later setup step was applied.`);
  return result.stdout.trim() ? (json ? JSON.parse(result.stdout) : result.stdout.trim()) : null;
}
function api(path, method = "GET", input) {
  return gh(["api", path, "--method", method, ...(input === undefined ? [] : ["--input", "-"])], input);
}

// Resolve every human reviewer and the source branch before remote mutations.
const repository = api(`repos/${repo}`);
if (!repository.permissions?.admin) throw Error("Repository admin access is required to configure branch protection and environments.");
const productionReviewers = reviewers.map((login) => ({ type: "User", id: api(`users/${login}`).id }));
const source = api(`repos/${repo}/git/ref/heads/${repository.default_branch}`);
const branches = gh(["api", `repos/${repo}/branches`, "--paginate", "--slurp"]).flat();
for (const branch of plan.branches) {
  if (!branches.some((item) => item.name === branch))
    api(`repos/${repo}/git/refs`, "POST", { ref: `refs/heads/${branch}`, sha: source.object.sha });
}

for (const [name, color] of Object.entries({ "user-story": "36AD94", bug: "ED535B", enhancement: "62B9CF", "tech-debt": "E6B64B" }))
  gh(["label", "create", name, "--repo", repo, "--color", color, "--force"], undefined, false);

// Existing stories are reused, including closed ones. Never overwrite human edits.
const existing = gh(["api", `repos/${repo}/issues?state=all&per_page=100`, "--paginate", "--slurp"]).flat().filter((issue) => !issue.pull_request);
const issueLinks = [];
for (const story of stories) {
  const issue = existing.find((item) => item.title.startsWith(`[${story.id}]`)) ||
    api(`repos/${repo}/issues`, "POST", { title: story.title, body: story.body, labels: ["user-story"] });
  issueLinks.push({ id: story.id, number: issue.number, url: issue.html_url });
}

const projects = gh(["project", "list", "--owner", owner, "--limit", "1000", "--format", "json"]).projects;
const project = projects.find((item) => item.title === plan.project && !item.closed) ||
  gh(["project", "create", "--owner", owner, "--title", plan.project, "--format", "json"]);
for (const issue of issueLinks)
  gh(["project", "item-add", String(project.number), "--owner", owner, "--url", issue.url, "--format", "json"]);

for (const branch of plan.branches)
  api(`repos/${repo}/branches/${branch}/protection`, "PUT", {
    required_status_checks: { strict: true, contexts: plan.requiredChecks },
    enforce_admins: true,
    required_pull_request_reviews: { dismiss_stale_reviews: true, required_approving_review_count: 1 },
    restrictions: null,
    required_conversation_resolution: true,
    allow_force_pushes: false,
    allow_deletions: false,
  });
api(`repos/${repo}/environments/staging`, "PUT", {});
api(`repos/${repo}/environments/production`, "PUT", {
  wait_timer: 0,
  prevent_self_review: true,
  reviewers: productionReviewers,
  deployment_branch_policy: { protected_branches: true, custom_branch_policies: false },
});
api(`repos/${repo}/vulnerability-alerts`, "PUT");
const variables = api(`repos/${repo}/actions/variables?per_page=100`).variables;
for (const name of ["DEPLOY_STAGING", "DEPLOY_PRODUCTION", "RUN_PERFORMANCE"])
  if (!variables.some((variable) => variable.name === name))
    api(`repos/${repo}/actions/variables`, "POST", { name, value: "false" });

await writeFile(new URL("../docs/backlog-issues.json", import.meta.url), JSON.stringify({ repository: repo, project: project.url, issues: issueLinks }, null, 2) + "\n");
console.log(`Configured ${repo}: ${issueLinks.length} stories, project, protected branches and production reviewers. Deployment remains opt-in; hosting secrets are not read or written by this script.`);
