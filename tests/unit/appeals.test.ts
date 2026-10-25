import test from "node:test";
import assert from "node:assert/strict";
import {
  APPEAL_WINDOW_MS,
  appealScore,
  submitAppeal,
  resolveAppeal,
} from "@/features/assignments/domain/appeals";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import { visibleAssignment } from "@/features/assignments/domain/assignment-visibility";
import { generatedResult } from "@/features/pairwise/domain/generated-results";
import { AssignmentService } from "@/features/assignments/server/assignment-service";
import type { AssignmentRepository } from "@/features/assignments/server/assignment-repository";
import { FakeAssignmentRepository } from "../fakes/fake-assignment-repository";
import { makeVotingFixture, makeUser } from "../factories";
import {
  buildPairEvalWorkbook,
  type ExportData,
} from "@/features/pairwise/services/export-service";

function fixture() {
  const f = makeVotingFixture();
  f.assignment.status = "closed";
  applyAssignmentCommand(f.assignment, f.teacher, "finalize", {});
  const finalizedAt = f.assignment.finalizedSnapshot!.finalizedAt;
  const now = Date.parse(finalizedAt);
  const input = {
    expectedFinalizedAt: finalizedAt,
    message: "Please review my participation score",
  };
  return { ...f, finalizedAt, now, input };
}
test("appeals accept both seven-day boundaries but reject future, expired and non-finalized scores", () => {
  for (const offset of [0, APPEAL_WINDOW_MS]) {
    const f = fixture();
    submitAppeal(f.assignment, f.student, f.input, f.now + offset);
    assert.equal(f.assignment.appeals!.length, 1);
    assert.equal(f.assignment.appeals![0].studentId, f.student.id);
  }
  for (const offset of [-1, APPEAL_WINDOW_MS + 1]) {
    const f = fixture();
    assert.throws(
      () => submitAppeal(f.assignment, f.student, f.input, f.now + offset),
      { status: 409 },
    );
    assert.equal(f.assignment.appeals, undefined);
  }
  for (const status of ["draft", "active", "closed"] as const) {
    const f = fixture();
    f.assignment.status = status;
    assert.throws(() => submitAppeal(f.assignment, f.student, f.input, f.now), {
      status: 409,
    });
  }
});
test("appeal validation checks membership, role, reason, current cycle and duplicate requests", () => {
  const f = fixture();
  for (const user of [makeUser(), f.teacher])
    assert.throws(() => submitAppeal(f.assignment, user, f.input, f.now), {
      status: 403,
    });
  for (const message of ["", "  ", "x".repeat(2001), {}, null])
    assert.throws(
      () =>
        submitAppeal(f.assignment, f.student, { ...f.input, message }, f.now),
      { status: 400 },
    );
  assert.throws(
    () =>
      submitAppeal(
        f.assignment,
        f.student,
        { ...f.input, expectedFinalizedAt: "old" },
        f.now,
      ),
    { status: 409 },
  );
  submitAppeal(
    f.assignment,
    f.student,
    { ...f.input, studentId: f.other.id },
    f.now,
  );
  assert.equal(f.assignment.appeals![0].studentId, f.student.id);
  assert.throws(() => submitAppeal(f.assignment, f.student, f.input, f.now), {
    status: 409,
  });
});
test("only owning teacher can resolve; uphold is immutable and can happen after the intake window", () => {
  const f = fixture();
  submitAppeal(f.assignment, f.student, f.input, f.now);
  const input = {
    expectedFinalizedAt: f.finalizedAt,
    appealId: f.assignment.appeals![0].id,
    outcome: "uphold",
    response: "Original calculation is correct",
  };
  for (const user of [f.student, makeUser({ role: "teacher" })])
    assert.throws(() => resolveAppeal(f.assignment, user, input), {
      status: 403,
    });
  resolveAppeal(f.assignment, f.teacher, input, f.now + APPEAL_WINDOW_MS * 2);
  assert.equal(f.assignment.appeals![0].decision!.outcome, "uphold");
  assert.equal(appealScore(f.assignment, f.student.id, 10), 10);
  assert.throws(() => resolveAppeal(f.assignment, f.teacher, input), {
    status: 409,
  });
});
test("override requires valid bounded numeric total and explanation; changes only the appellant, preserves snapshot", () => {
  const f = fixture();
  f.assignment.pairs = [];
  submitAppeal(f.assignment, f.student, f.input, f.now);
  const snapshot = structuredClone(f.assignment.finalizedSnapshot);
  const input = {
    expectedFinalizedAt: f.finalizedAt,
    appealId: f.assignment.appeals![0].id,
    outcome: "override",
    response: "Corrected missing participation",
    score: 17.25,
  };
  for (const score of [-1, 20.01, Infinity, NaN, null, "10", ""])
    assert.throws(
      () => resolveAppeal(f.assignment, f.teacher, { ...input, score }),
      { status: 400 },
    );
  for (const response of ["", "  ", "x".repeat(2001)])
    assert.throws(
      () => resolveAppeal(f.assignment, f.teacher, { ...input, response }),
      { status: 400 },
    );
  assert.throws(
    () =>
      resolveAppeal(f.assignment, f.teacher, { ...input, outcome: "other" }),
    { status: 400 },
  );
  assert.throws(
    () =>
      resolveAppeal(f.assignment, f.teacher, { ...input, appealId: "missing" }),
    { status: 404 },
  );
  resolveAppeal(f.assignment, f.teacher, input);
  assert.equal(appealScore(f.assignment, f.student.id, null), 17.25);
  assert.equal(generatedResult(f.assignment, f.student.id).finalScore, 17.25);
  assert.equal(appealScore(f.assignment, f.other.id, 9), 9);
  assert.deepEqual(f.assignment.finalizedSnapshot, snapshot);
});
test("zero is a valid override; reopened/regenerated/refinalized results cannot inherit stale decisions", () => {
  const f = fixture();
  submitAppeal(f.assignment, f.student, f.input, f.now);
  const input = {
    expectedFinalizedAt: f.finalizedAt,
    appealId: f.assignment.appeals![0].id,
    outcome: "override",
    response: "Corrected",
    score: 0,
  };
  resolveAppeal(f.assignment, f.teacher, input);
  assert.equal(appealScore(f.assignment, f.student.id, 10), 0);
  f.assignment.status = "closed";
  assert.equal(appealScore(f.assignment, f.student.id, 10), 10);
  f.assignment.status = "finalized";
  f.assignment.finalizedSnapshot!.finalizedAt = new Date(
    f.now + 1000,
  ).toISOString();
  assert.equal(appealScore(f.assignment, f.student.id, 10), 10);
  assert.throws(
    () =>
      resolveAppeal(f.assignment, f.teacher, {
        ...input,
        expectedFinalizedAt: f.assignment.finalizedSnapshot!.finalizedAt,
      }),
    { status: 409 },
  );
  submitAppeal(
    f.assignment,
    f.student,
    {
      ...f.input,
      expectedFinalizedAt: f.assignment.finalizedSnapshot!.finalizedAt,
    },
    f.now + 1000,
  );
  assert.equal(f.assignment.appeals!.length, 2);
});
test("students receive only their own appeals and public finalized timestamp; teachers retain all requests", () => {
  const f = fixture();
  submitAppeal(f.assignment, f.student, f.input, f.now);
  submitAppeal(f.assignment, f.other, f.input, f.now);
  resolveAppeal(f.assignment, f.teacher, {
    ...f.input,
    appealId: f.assignment.appeals![0].id,
    outcome: "uphold",
    response: "Reviewed",
  });
  const visible = visibleAssignment(f.assignment, f.student.id);
  assert.equal(visible.appeals!.length, 1);
  assert.equal(visible.appeals![0].studentId, f.student.id);
  assert.equal(visible.appeals![0].decision!.decidedBy, "teacher");
  assert.equal(visible.finalizedAt, f.finalizedAt);
  assert.equal(visible.finalizedSnapshot, undefined);
  assert.equal(
    visibleAssignment(f.assignment, f.teacher.id).appeals!.length,
    2,
  );
});
test("service retries concurrent requests without duplicating appeals or losing another student's request", async () => {
  const f = fixture();
  const repository = new FakeAssignmentRepository([f.assignment]);
  const service = new AssignmentService(repository);
  const results = await Promise.allSettled(
    [f.student, f.student, f.other].map((user) =>
      service.execute(user, {
        ...f.input,
        action: "submitAppeal",
        id: f.assignment.id,
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 2);
  const saved = (await repository.findById(f.assignment.id))!.assignment;
  assert.equal(saved.appeals!.length, 2);
  await assert.rejects(
    service.execute(makeUser(), {
      ...f.input,
      action: "submitAppeal",
      id: saved.id,
    }),
    { status: 403 },
  );
});
test("service passes appeal changes and score override audit together to the atomic repository write", async () => {
  const f = fixture();
  const repository = new FakeAssignmentRepository([f.assignment]);
  const originalUpdate = repository.update.bind(repository);
  const writes: Parameters<AssignmentRepository["update"]>[] = [];
  repository.update = async (
    ...args: Parameters<AssignmentRepository["update"]>
  ) => {
    writes.push(structuredClone(args));
    return originalUpdate(args[0], args[1]);
  };
  const service = new AssignmentService(repository);
  const studentView = await service.execute(f.student, {
    ...f.input,
    action: "submitAppeal",
    id: f.assignment.id,
  });
  assert.equal(writes[0][4]!.action, "APPEAL_SUBMIT");
  assert.equal(writes[0][4]!.actorId, f.student.id);
  const appealId = studentView.appeals![0].id;
  await service.execute(f.teacher, {
    expectedFinalizedAt: f.finalizedAt,
    id: f.assignment.id,
    action: "resolveAppeal",
    appealId,
    outcome: "override",
    response: "Reviewed evidence",
    score: 12,
  });
  assert.equal(writes[1][4]!.action, "SCORE_OVERRIDE");
  assert.equal(writes[1][4]!.actorId, f.teacher.id);
  assert.equal(
    (writes[1][4]!.before as { decision?: unknown }).decision,
    undefined,
  );
  assert.equal(
    appealScore(
      (await repository.findById(f.assignment.id))!.assignment,
      f.student.id,
      1,
    ),
    12,
  );
});

test("Excel and CSV source worksheet uses the appellant's final override including zero, leaving other totals unchanged", async () => {
  const f = fixture();
  submitAppeal(f.assignment, f.student, f.input, f.now);
  resolveAppeal(f.assignment, f.teacher, {
    ...f.input,
    appealId: f.assignment.appeals![0].id,
    outcome: "override",
    response: "Verified",
    score: 12.5,
  });
  const data: ExportData = {
    finalScoreOverrides: {
      [f.student.id]: appealScore(f.assignment, f.student.id, 99)!,
    },
    classroom: {
      id: "c",
      name: "Class",
      slug: "class",
      timezone: "Asia/Bangkok",
      allowed_email_domains: [],
      status: "ACTIVE",
      created_by: f.teacher.id,
      created_at: f.finalizedAt,
    },
    assignment: {
      id: f.assignment.id,
      classroom_id: "c",
      name: "Assignment",
      slug: "assignment",
      description: "",
      group_max_score: 15,
      individual_max_score: 0,
      group_deadline_utc: f.finalizedAt,
      individual_deadline_utc: f.finalizedAt,
      instructor_weight: 1,
      target_coverage: 3,
      max_workload: 8,
      min_comparisons: 3,
      score_floor: 0.6,
      score_ceiling: 1,
      completion_threshold: 0.9,
      scoring_formula_version: "v2.0",
      pairing_seed: 1,
      status: "FINALIZED",
      created_by: f.teacher.id,
      created_at: f.finalizedAt,
      criteria: [
        {
          id: "criterion",
          assignment_id: f.assignment.id,
          side: "INDIVIDUAL",
          name: "Teamwork",
          description: "",
          weight_pct: 100,
          display_order: 1,
        },
      ],
    },
    groups: f.assignment.groups.map((g) => ({
      id: g.id,
      name: g.name,
      classroom_id: "c",
      created_at: f.finalizedAt,
    })),
    members: [f.student, f.other].map((s, i) => ({
      id: s.id,
      user_id: s.id,
      classroom_id: "c",
      role: "STUDENT",
      group_id: f.assignment.groups[i].id,
      email: s.email,
      display_name: s.name,
      joined_at: f.finalizedAt,
    })),
    pairs: [],
    comparisons: [],
  };
  const wb = await buildPairEvalWorkbook(data);
  const sheet = wb.getWorksheet("Individual Summary")!;
  assert.equal(sheet.getRow(2).getCell(11).value, 12.5);
  assert.equal(sheet.getRow(3).getCell(11).value, 0);
  const { worksheetToCsv } =
    await import("@/features/pairwise/services/csv-service");
  assert.ok(worksheetToCsv(sheet).includes('"Personal Final Score"'));
  assert.equal(wb.worksheets.length, 4);
  data.finalScoreOverrides![f.student.id] = 0;
  const zero = await buildPairEvalWorkbook(data);
  assert.equal(
    zero.getWorksheet("Individual Summary")!.getRow(2).getCell(11).value,
    0,
  );
});
