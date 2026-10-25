import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import {
  seedTestRun,
  cleanupTestRun,
} from "@/features/testing/server/test-data-service";

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    process.env.DATABASE_DRIVER !== "postgres" ||
    !url.pathname.endsWith("_test") ||
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw Error(
      "Local performance requires a local, isolated *_test PostgreSQL database.",
    );
  const strict = process.argv.includes("--strict");
  const runId = randomUUID();
  const account = {
    id: randomUUID(),
    name: "Local Performance Teacher",
    email: `${randomUUID()}@e2e.invalid`,
    password: randomBytes(24).toString("hex"),
    role: "teacher",
  };
  await mkdir("docs/evidence", { recursive: true });
  await seedTestRun({ runId, users: [account] });
  try {
    const args = [
      "run",
      "--rm",
      "--user",
      `${process.getuid?.() || 1000}:${process.getgid?.() || 1000}`,
      "-v",
      `${process.cwd()}:/work`,
      "-w",
      "/work",
      "-e",
      "K6_USER_EMAIL",
      "-e",
      "K6_USER_PASSWORD",
      "-e",
      "BASE_URL",
      "-e",
      "APP_ORIGIN",
      "-e",
      "K6_PROFILE",
      "-e",
      "STRICT_THRESHOLDS",
      "grafana/k6:2.3.0",
      "run",
      "--quiet",
      `--summary-export=performance/${strict ? "gate-probe" : "baseline"}.json`,
      "performance/load-test.js",
    ];
    const started = performance.now();
    const child = spawn("docker", args, {
      env: {
        ...process.env,
        K6_USER_EMAIL: account.email,
        K6_USER_PASSWORD: account.password,
        BASE_URL: "http://host.docker.internal:3200",
        APP_ORIGIN: "http://127.0.0.1:3200",
        K6_PROFILE: strict ? "smoke" : "baseline",
        STRICT_THRESHOLDS: strict ? "1" : "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    const code = await new Promise<number>((resolve) =>
      child.on("close", (code) => resolve(code ?? 1)),
    );
    await writeFile(
      `docs/evidence/k6-${strict ? "gate" : "baseline"}.txt`,
      output,
    );
    const result = {
      date: new Date().toISOString(),
      target: "local Docker runtime on port 3200 (not staging)",
      profile: strict
        ? "10-second deliberately impossible threshold"
        : "30s ramp to 5 / 60s at up to 10 / 30s ramp down",
      exitCode: code,
      durationSeconds: Math.round((performance.now() - started) / 100) / 10,
      ...(strict ? { thresholdFailureDetected: code === 99 } : {}),
    };
    await writeFile(
      `docs/evidence/performance-${strict ? "gate" : "baseline"}.json`,
      JSON.stringify(result, null, 2) + "\n",
    );
    console.log(JSON.stringify(result, null, 2));
    if (strict ? code !== 99 : code !== 0) process.exitCode = 1;
  } finally {
    await cleanupTestRun(runId);
    process.exit(process.exitCode || 0);
  }
}
void main().catch(() => {
  console.error(
    "Local performance setup or cleanup failed; no credentials are printed.",
  );
  process.exit(1);
});
