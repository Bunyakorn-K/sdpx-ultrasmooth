import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const probe =
  "const fs=require('node:fs'),cp=require('node:child_process');fs.writeFileSync('/tmp/intentional.test.mjs',\"import test from 'node:test';import assert from 'node:assert/strict';test('intentional failure',()=>assert.equal(1,2));\");const result=cp.spawnSync(process.execPath,['--test','/tmp/intentional.test.mjs'],{stdio:'inherit'});process.exit(result.status??1);";
const result = spawnSync(
  "docker",
  [
    "compose",
    "-f",
    "compose.test.yaml",
    "run",
    "--rm",
    "--no-deps",
    "unit",
    "node",
    "-e",
    probe,
  ],
  { encoding: "utf8" },
);
const evidence = {
  date: new Date().toISOString(),
  probe: "real node:test assertion failure inside the unit container",
  exitCode: result.status,
  failingAssertionDetected: result.stdout.includes("intentional failure"),
  passed: result.status === 1 && result.stdout.includes("intentional failure"),
};
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  "docs/evidence/container-exit.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence, null, 2));
if (!evidence.passed) process.exitCode = 1;
