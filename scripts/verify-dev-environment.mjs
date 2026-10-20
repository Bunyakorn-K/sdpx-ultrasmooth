import { spawnSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
const env = { ...process.env, APP_PORT: "3301" };
const prefix = ["compose", "-p", "peerly-lab-dev"];
const run = (args) =>
  spawnSync("docker", [...prefix, ...args], { encoding: "utf8", env });
const samples = [];
try {
  for (const build of [true, false]) {
    const start = performance.now();
    const result = run(["up", "-d", ...(build ? ["--build"] : []), "--wait"]);
    if (result.status !== 0)
      throw Error("Isolated development Compose startup failed.");
    const health = await fetch("http://127.0.0.1:3301/api/health");
    samples.push({
      phase: build
        ? "first startup with existing base/dependency cache"
        : "restart after compose down",
      seconds: Math.round((performance.now() - start) / 100) / 10,
      httpStatus: health.status,
    });
    if (!health.ok) throw Error("Development health verification failed.");
    if (build && run(["down"]).status !== 0)
      throw Error("Development teardown failed.");
  }
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    "docs/evidence/dev-environment.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        project: "isolated peerly-lab-dev",
        port: 3301,
        defaultPortLeftUntouched: 3000,
        samples,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(samples, null, 2));
} finally {
  run(["down", "-v"]);
}
