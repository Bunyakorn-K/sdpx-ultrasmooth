import test from "node:test";
import assert from "node:assert/strict";
import { rawExportFixture } from "../fakes/raw-export-fixture";
import { RawExportService } from "@/features/assignments/server/raw-export-service";
import { makeUser } from "../factories";
import type { ClassroomRepository } from "@/features/classroom/server/classroom-repository";

test("raw pseudonyms are consistent within a file, unlinkable across downloads, and remove identity-bearing pair/response IDs", async () => {
  const f = rawExportFixture();
  const one = await f.service.export(f.teacher, f.assignment.id, {});
  const two = await f.service.export(f.teacher, f.assignment.id, {});
  const rows = one.csv
    .slice(1)
    .trim()
    .split("\r\n")
    .map((r) => r.split(","));
  assert.equal(rows.length, 3);
  assert.equal(rows[1][1], rows[2][1]);
  assert.match(rows[1][1], /^"anon-[0-9a-f-]+"$/);
  assert.ok(!two.csv.includes(rows[1][1]));
  for (const privateValue of [
    f.student.id,
    f.student.name,
    f.student.email,
    f.pair.id,
    "group-a",
    "group-b",
    "archived",
    "draft",
  ])
    assert.ok(!one.csv.includes(privateValue), privateValue);
  assert.ok(one.csv.includes('"EXCLUDED"')); // Preserve excluded decisions' status for raw analysis.
  assert.ok(one.filename.endsWith(".csv"));
  assert.ok(!one.csv.includes("Evaluator Email"));
  assert.equal(f.audits.length, 0);
});

test("identity exports require teacher ownership and exact boolean confirmation, reject unknown modes, and never read identities on failure", async () => {
  const f = rawExportFixture();
  for (const user of [
    f.student,
    makeUser({ role: "teacher" }),
    { ...f.teacher, role: "student" as const },
  ])
    await assert.rejects(
      f.service.export(user, f.assignment.id, {
        identityMode: "identified",
        confirmIdentity: true,
      }),
      { status: 403 },
    );
  for (const confirmIdentity of [undefined, false, "true", 1, {}])
    await assert.rejects(
      f.service.export(f.teacher, f.assignment.id, {
        identityMode: "identified",
        confirmIdentity,
      }),
      { status: 400 },
    );
  await assert.rejects(
    f.service.export(f.teacher, f.assignment.id, { identityMode: "invalid" }),
    { status: 400 },
  );
  await assert.rejects(f.service.export(f.teacher, "missing", {}), {
    status: 404,
  });
  assert.equal(f.lookups.length, 0);
  assert.equal(f.audits.length, 0);
});

test("identity audit must succeed before any CSV is returned and contains scope without copying personal data", async () => {
  const f = rawExportFixture();
  const fail = new RawExportService(f.repository, f.identities, {
    record: async () => {
      throw Error("Audit unavailable");
    },
  });
  await assert.rejects(
    fail.export(f.teacher, f.assignment.id, {
      identityMode: "identified",
      confirmIdentity: true,
    }),
    /Audit unavailable/,
  );
  const result = await f.service.export(f.teacher, f.assignment.id, {
    identityMode: "identified",
    confirmIdentity: true,
  });
  assert.ok(result.csv.includes(f.student.name));
  assert.ok(result.csv.includes(f.student.id));
  const audit = f.audits[0];
  assert.equal(audit.assignment_id, f.assignment.id);
  assert.equal(audit.resource_id, f.assignment.id);
  assert.equal(audit.after_state!.rowCount, 2);
  assert.equal(audit.after_state!.assignmentVersion, 0);
  assert.equal(audit.after_state!.identityMode, "identified");
  assert.ok(!JSON.stringify(audit).includes(f.student.email));
  assert.match(result.filename, /raw-comparisons-identified/);
});

test("raw export uses finalized snapshot inputs, excludes drafts, dangling and mismatched evaluator responses", async () => {
  const f = rawExportFixture();
  const a = structuredClone(f.assignment);
  a.status = "finalized";
  a.finalizedSnapshot = {
    finalizedAt: a.createdAt,
    finalizedBy: f.teacher.id,
    inputs: {
      votes: [],
      groups: [],
      questions: [],
      pairs: a.pairs,
      comparisons: a.comparisons,
    },
    outputs: {},
  };
  a.comparisons = [];
  a.finalizedSnapshot.inputs.comparisons!.push({
    ...a.finalizedSnapshot.inputs.comparisons![0],
    id: "forged",
    evaluator_user_id: "outsider",
  });
  await f.repository.update(a, 0);
  const result = await f.service.export(f.teacher, a.id, {});
  assert.equal(result.csv.trim().split("\r\n").length, 3);
  assert.ok(!result.csv.includes("outsider"));
});

test("cross-classroom exports fail even for an assignment owner; missing pairwise data fails without identity audit", async () => {
  const classroom = {
    findById: async () => ({
      classroom: { created_by: "another-owner" },
      version: 0,
    }),
  } as unknown as ClassroomRepository;
  const f = rawExportFixture(classroom);
  await f.repository.update(
    { ...f.assignment, classroomId: "other-classroom" },
    0,
  );
  await assert.rejects(f.service.export(f.teacher, f.assignment.id, {}), {
    status: 403,
  });
  await f.repository.update({ ...f.assignment, pairs: undefined }, 1);
  await assert.rejects(f.service.export(f.teacher, f.assignment.id, {}), {
    status: 409,
  });
  assert.equal(f.audits.length, 0);
});

test("identity CSV escapes formula-like names and quotes while an empty export remains a valid BOM-prefixed header", async () => {
  const f = rawExportFixture();
  f.student.name = '=SUM(1,2) "test"';
  const result = await f.service.export(f.teacher, f.assignment.id, {
    identityMode: "identified",
    confirmIdentity: true,
  });
  assert.ok(result.csv.includes(`"'=SUM(1,2) ""test"""`));
  await f.repository.update({ ...f.assignment, pairs: [], comparisons: [] }, 0);
  const empty = await f.service.export(f.teacher, f.assignment.id, {});
  assert.ok(empty.csv.startsWith("\uFEFF"));
  assert.equal(empty.csv.trim().split("\r\n").length, 1);
});
