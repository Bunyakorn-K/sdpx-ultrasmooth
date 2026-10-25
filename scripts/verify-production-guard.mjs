import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const name = "peerly-production-guard-probe";
const token = randomBytes(32).toString("hex");
const started = spawnSync(
  "docker",
  [
    "run",
    "-d",
    "--rm",
    "--name",
    name,
    "-p",
    "127.0.0.1:3201:3000",
    "-e",
    "E2E_TEST_MODE=1",
    "-e",
    "E2E_SEED_TOKEN",
    "-e",
    "DATABASE_DRIVER=postgres",
    "-e",
    "DATABASE_URL=postgresql://localhost/peerly_test",
    "peerly:lab-runtime",
  ],
  { encoding: "utf8", env: { ...process.env, E2E_SEED_TOKEN: token } },
);
if (started.status !== 0)
  throw Error("Could not start the isolated production guard probe.");
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      ready = (await fetch("http://127.0.0.1:3201/api/health")).ok;
    } catch {
      /* Wait for readiness. */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw Error("Production probe did not become ready.");
  const statuses = [];
  for (const path of ["/api/test/seed", "/api/test/cleanup"])
    statuses.push(
      (
        await fetch(`http://127.0.0.1:3201${path}`, {
          method: "POST",
          headers: {
            "x-test-token": token,
            "Content-Type": "application/json",
          },
          body: "{}",
        })
      ).status,
    );
  const user = spawnSync(
    "docker",
    ["inspect", name, "--format", "{{.Config.User}}"],
    { encoding: "utf8" },
  ).stdout.trim();
  const result = {
    date: new Date().toISOString(),
    productionMode: true,
    testFlagsAndCorrectTokenPresent: true,
    seedStatus: statuses[0],
    cleanupStatus: statuses[1],
    runtimeUser: user,
    passed: statuses.every((status) => status === 404) && user === "node",
  };
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    "docs/evidence/production-guard.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
} finally {
  spawnSync("docker", ["stop", name], { stdio: "ignore" });
}
