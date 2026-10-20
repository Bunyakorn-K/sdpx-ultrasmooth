import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const sourcePath = "src/features/assignments/domain/assignment-policy.ts";
const original = await readFile(sourcePath, "utf8");
const mutant = original.replace("if (alreadyVoted)", "if (false)");
if (mutant === original)
  throw Error(
    "Expected duplicate-vote rule not found; refusing to mutate another rule.",
  );
const tests = ["tests/model.test.mjs", "tests/services.test.mjs"];
const hashes = await Promise.all(
  tests.map(async (path) =>
    createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
  ),
);
let mutation;
try {
  await writeFile(sourcePath, mutant);
  mutation = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--test",
      "--test-name-pattern=duplicate vote is rejected",
      "tests/model.test.mjs",
    ],
    { encoding: "utf8" },
  );
} finally {
  const current = await readFile(sourcePath, "utf8");
  if (current !== mutant)
    throw Error(
      "Source changed concurrently. Restore manually; concurrent edits were preserved.",
    );
  await writeFile(sourcePath, original);
}
const directory = await mkdtemp(join(tmpdir(), "peerly-exit-"));
let exitProbe;
try {
  const file = join(directory, "intentional.test.mjs");
  await writeFile(
    file,
    "import test from 'node:test';import assert from 'node:assert/strict';test('intentional failure',()=>assert.equal(1,2));\n",
  );
  exitProbe = spawnSync(process.execPath, ["--test", file], {
    encoding: "utf8",
  });
} finally {
  await rm(directory, { recursive: true });
}
const unchanged = (
  await Promise.all(
    tests.map(
      async (path, index) =>
        createHash("sha256")
          .update(await readFile(path))
          .digest("hex") === hashes[index],
    ),
  )
).every(Boolean);
const result = {
  date: new Date().toISOString(),
  rule: "duplicate vote is rejected",
  mutationExitCode: mutation.status,
  failingTestDetected:
    mutation.status !== 0 &&
    mutation.stdout.includes("duplicate vote is rejected"),
  sourceRestored: (await readFile(sourcePath, "utf8")) === original,
  existingTestsUnchanged: unchanged,
  intentionalFailureExitCode: exitProbe.status,
};
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  "docs/evidence/fidelity.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
if (
  !result.failingTestDetected ||
  !result.sourceRestored ||
  !unchanged ||
  exitProbe.status === 0
)
  process.exitCode = 1;
