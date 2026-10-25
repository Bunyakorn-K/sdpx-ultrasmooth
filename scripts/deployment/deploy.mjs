import { spawn, spawnSync } from "node:child_process";
import { appendFile, mkdir, writeFile } from "node:fs/promises";

export async function deploy(environment) {
  if (environment !== "staging" && environment !== "production")
    throw Error("Unknown deployment environment.");
  for (const name of ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"])
    if (!process.env[name])
      throw Error(`Missing deployment configuration: ${name}`);

  const started = Date.now();
  const child = spawn(
    "npx",
    [
      "--yes",
      "vercel@64.7.0",
      "deploy",
      "--yes",
      ...(environment === "production" ? ["--prod"] : []),
      "--token",
      process.env.VERCEL_TOKEN,
    ],
    { env: process.env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  // The CLI may print credentials or environment details on failure.
  child.stderr.resume();
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  if (code !== 0)
    throw Error(
      "Deployment failed; inspect the hosting platform. CLI output is withheld.",
    );
  const url = output
    .trim()
    .split(/\s+/)
    .findLast((value) => /^https:\/\/[^\s/]+\.vercel\.app\/?$/.test(value));
  if (!url) throw Error("Deployment did not return a verifiable Vercel URL.");
  let healthy = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(`${url}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        healthy = true;
        break;
      }
    } catch {
      /* Wait for this deployment to become ready. */
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!healthy)
    throw Error("Deployment exists but HTTP health verification failed.");

  const completed = Date.now();
  const commit = spawnSync("git", ["show", "-s", "--format=%H%n%cI", "HEAD"], {
    encoding: "utf8",
  });
  const [sha, committedAt] =
    commit.status === 0 ? commit.stdout.trim().split("\n") : [];
  const commitTime = Date.parse(committedAt);
  const metrics = {
    environment,
    deploymentUrl: url,
    commit: sha || null,
    committedAt: Number.isFinite(commitTime) ? committedAt : null,
    healthyAt: new Date(completed).toISOString(),
    deployToHealthSeconds: (completed - started) / 1000,
    commitToLiveSeconds:
      Number.isFinite(commitTime) && commitTime <= completed
        ? (completed - commitTime) / 1000
        : null,
  };
  await mkdir("deployment-results", { recursive: true });
  await writeFile(
    `deployment-results/${environment}.json`,
    JSON.stringify(metrics, null, 2) + "\n",
  );
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, `url=${url}\n`);
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `## ${environment} deployment\n\n${url}\n\n| Metric | Seconds |\n| --- | ---: |\n| Deploy → healthy | ${metrics.deployToHealthSeconds.toFixed(1)} |\n| Commit → healthy | ${metrics.commitToLiveSeconds?.toFixed(1) ?? "Unavailable"} |\n\nCommit-to-live uses the checked-out commit's committer timestamp.\n`,
    );
  console.log(`${environment} healthy: ${url}`);
}
