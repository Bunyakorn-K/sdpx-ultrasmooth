import test from "node:test";
import assert from "node:assert/strict";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import { visibleAssignment } from "@/features/assignments/domain/assignment-visibility";
import { previewRegeneration } from "@/features/pairwise/domain/regeneration";
import { generatedResult } from "@/features/pairwise/domain/generated-results";
import { deadlineReminder } from "@/features/notifications/domain/notification-policy";
import { AssignmentService } from "@/features/assignments/server/assignment-service";
import { FakeAssignmentRepository } from "../fakes/fake-assignment-repository";

const teacher: User = {
  id: "t",
  name: "Teacher",
  role: "teacher",
  email: "t@example.test",
};
const student: User = {
  id: "s00",
  name: "Student",
  role: "student",
  email: "s@example.test",
};
function fixture(): Assignment {
  const groups = Array.from({ length: 3 }, (_, i) => ({
    id: `g${i}`,
    name: `Group ${i}`,
    members: Array.from({ length: 3 }, (_, j) => ({
      id: `s${i}${j}`,
      name: `Student ${i}${j}`,
    })),
  }));
  const a: Assignment = {
    id: "a",
    ownerId: "t",
    title: "Evaluation",
    description: "",
    subject: "",
    color: "mint",

    createdAt: new Date().toISOString(),
    deadline: new Date(Date.now() + 3600000).toISOString(),
    status: "draft",
    questions: ["Quality", "Teamwork"],
    groups,
    students: groups.flatMap((g) => g.members),
    votes: [],
    targetCoverage: 3,
    maxWorkload: 10,
  };
  publish(a);
  return a;
}
function publish(a: Assignment, scope = "both") {
  const preview = previewRegeneration(a, scope as "both");
  applyAssignmentCommand(a, teacher, "regeneratePairs", {
    reason: "Test generation",
    scope,
    expectedGeneration: a.pairGeneration ?? 0,
    previewToken: preview.token,
  });
}
function input(a: Assignment, side = "GROUP", choice = 6) {
  return {
    side,
    expectedGeneration: a.pairGeneration,
    expectedRevision: 0,
    answers: a
      .pairs!.filter(
        (p) => p.evaluator_user_id === student.id && p.side === side,
      )
      .map((p) => ({ pairId: p.id, choice, timeOnTaskMs: 4000 })),
  };
}
test("draft autosave upserts choices without changing scores, participation, coverage or reminders", () => {
  const a = fixture();
  const before = generatedResult(a, student.id);
  const reminder = deadlineReminder(a, student.id);
  const draft = input(a);
  applyAssignmentCommand(a, student, "saveEvaluationDrafts", draft);
  assert.ok(a.evaluationDrafts!.length > 0);
  assert.ok(
    a.evaluationDrafts!.every((c) => c.status === "DRAFT" && !c.submitted_at),
  );
  assert.equal(a.comparisons!.length, 0);
  assert.deepEqual(generatedResult(a, student.id), before);
  assert.deepEqual(deadlineReminder(a, student.id), reminder);
  applyAssignmentCommand(a, student, "saveEvaluationDrafts", {
    ...draft,
    answers: [{ ...draft.answers[0], choice: 1 }],
  });
  assert.equal(a.evaluationDrafts!.length, draft.answers.length);
  assert.equal(
    a.evaluationDrafts!.find(
      (c) => c.pair_assignment_id === draft.answers[0].pairId,
    )!.choice,
    1,
  );
});
test("bulk submit accepts partial answers, versions resubmissions and preserves the other side", () => {
  const a = fixture();
  const group = input(a);
  const individual = input(a, "INDIVIDUAL", 2);
  applyAssignmentCommand(a, student, "submitEvaluation", individual);
  const peerAnswers = structuredClone(a.comparisons);
  applyAssignmentCommand(a, student, "saveEvaluationDrafts", group);
  applyAssignmentCommand(a, student, "submitEvaluation", {
    ...group,
    answers: group.answers.slice(0, 1),
  });
  assert.equal(a.comparisons!.length, peerAnswers!.length + 1);
  assert.equal(a.evaluationDrafts!.length, 0);
  const original = structuredClone(a.evaluationSubmissions!.at(-1));
  applyAssignmentCommand(a, student, "saveEvaluationDrafts", {
    ...group,
    expectedRevision: 1,
    answers: group.answers.map((c) => ({ ...c, choice: 1 })),
  });
  assert.equal(
    a.comparisons!.at(-1)!.choice,
    6,
    "editing after submit must not change published scores",
  );
  applyAssignmentCommand(a, student, "submitEvaluation", {
    ...group,
    expectedRevision: 1,
    answers: group.answers.map((c) => ({ ...c, choice: 1 })),
  });
  assert.equal(a.evaluationSubmissions!.at(-1)!.revision, 2);
  assert.deepEqual(a.evaluationSubmissions![1], original);
  assert.deepEqual(a.comparisons!.slice(0, peerAnswers!.length), peerAnswers);
  assert.ok(
    a.comparisons!.slice(peerAnswers!.length).every((c) => c.choice === 1),
  );
  applyAssignmentCommand(a, student, "submitEvaluation", {
    ...group,
    expectedRevision: 2,
    answers: [],
  });
  assert.deepEqual(
    a.comparisons,
    peerAnswers,
    "empty partial submission replaces only its side",
  );
  assert.equal(a.evaluationSubmissions!.at(-1)!.revision, 3);
  assert.throws(
    () =>
      applyAssignmentCommand(a, student, "submitPair", {
        ...group.answers[0],
        expectedGeneration: a.pairGeneration,
      }),
    { status: 409 },
    "legacy endpoint cannot bypass the latest bulk submission",
  );
});
test("invalid bulk inputs reject the entire request without partially saving", () => {
  for (const action of ["saveEvaluationDrafts", "submitEvaluation"]) {
    for (const invalid of [
      "choice",
      "duplicate",
      "foreign",
      "side",
      "time",
      "malformed",
    ]) {
      const a = fixture();
      const data = input(a);
      const bad: Record<string, unknown> = {
        ...data,
        answers: [...data.answers],
      };
      if (invalid === "choice")
        bad.answers = [data.answers[0], { ...data.answers[1], choice: 7 }];
      if (invalid === "duplicate")
        bad.answers = [data.answers[0], data.answers[0]];
      if (invalid === "foreign")
        bad.answers = [
          data.answers[0],
          {
            ...data.answers[1],
            pairId: a.pairs!.find((p) => p.evaluator_user_id !== student.id)!
              .id,
          },
        ];
      if (invalid === "side") bad.side = "BOTH";
      if (invalid === "time")
        bad.answers = [{ ...data.answers[0], timeOnTaskMs: -1 }];
      if (invalid === "malformed") bad.answers = [null];
      const before = structuredClone(a);
      assert.throws(() => applyAssignmentCommand(a, student, action, bad));
      assert.deepEqual(a, before);
    }
  }
});
test("draft and submission enforce student ownership, generation, revision, lifecycle and deadline", () => {
  for (const action of ["saveEvaluationDrafts", "submitEvaluation"]) {
    for (const invalid of [
      "teacher",
      "outsider",
      "generation",
      "revision",
      "draft",
      "closed",
      "finalized",
      "deadline",
    ]) {
      const a = fixture();
      const data = input(a);
      let user = student;
      if (invalid === "teacher") user = teacher;
      if (invalid === "outsider") user = { ...student, id: "outsider" };
      if (invalid === "generation") data.expectedGeneration = 0;
      if (invalid === "revision") data.expectedRevision = 1;
      if (["draft", "closed", "finalized"].includes(invalid))
        a.status = invalid as Assignment["status"];
      if (invalid === "deadline") a.deadline = "2020-01-01";
      assert.throws(() => applyAssignmentCommand(a, user, action, data), {
        status: ["generation", "revision"].includes(invalid) ? 409 : 403,
      });
    }
  }
});
test("only the evaluator can read drafts and submission revision snapshots", () => {
  const a = fixture();
  const data = input(a);
  applyAssignmentCommand(a, student, "submitEvaluation", data);
  applyAssignmentCommand(a, student, "saveEvaluationDrafts", {
    ...data,
    expectedRevision: 1,
    answers: [{ ...data.answers[0], choice: 1 }],
  });
  assert.equal(visibleAssignment(a, student.id).evaluationDrafts!.length, 1);
  assert.equal(
    visibleAssignment(a, student.id).evaluationSubmissions!.length,
    1,
  );
  assert.equal(visibleAssignment(a, "s01").evaluationDrafts!.length, 0);
  assert.equal(visibleAssignment(a, "s01").evaluationSubmissions!.length, 0);
  assert.equal(visibleAssignment(a, teacher.id).evaluationDrafts, undefined);
  assert.equal(
    a.evaluationDrafts!.length,
    1,
    "filtering must not mutate stored drafts",
  );
});
test("regenerating a side archives its draft and revisions and retains the other side", () => {
  const a = fixture();
  for (const side of ["GROUP", "INDIVIDUAL"]) {
    applyAssignmentCommand(a, student, "submitEvaluation", input(a, side));
    applyAssignmentCommand(a, student, "saveEvaluationDrafts", {
      ...input(a, side, 1),
      expectedRevision: 1,
    });
  }
  const peerDraft = structuredClone(
    a.evaluationDrafts!.filter(
      (c) =>
        a.pairs!.find((p) => p.id === c.pair_assignment_id)!.side ===
        "INDIVIDUAL",
    ),
  );
  applyAssignmentCommand(a, teacher, "unpublishPairs", {
    reason: "Review",
    expectedGeneration: 1,
  });
  publish(a, "group");
  assert.deepEqual(a.evaluationDrafts, peerDraft);
  assert.ok(a.evaluationSubmissions!.every((s) => s.side === "INDIVIDUAL"));
  assert.equal(a.pairHistory!.at(-1)!.evaluationSubmissions!.length, 1);
  assert.ok(a.pairHistory!.at(-1)!.evaluationDrafts!.length);
  assert.equal(
    visibleAssignment(a, teacher.id).pairHistory!.at(-1)!.evaluationDrafts,
    undefined,
  );
  assert.equal(
    visibleAssignment(a, "s01").pairHistory!.at(-1)!.evaluationSubmissions!
      .length,
    0,
  );
});
test("concurrent bulk submissions produce one revision; stale autosave cannot overwrite it", async () => {
  const a = fixture();
  const repo = new FakeAssignmentRepository([a]);
  const service = new AssignmentService(repo);
  const data = { ...input(a), action: "submitEvaluation", id: a.id };
  const results = await Promise.allSettled([
    service.execute(student, data),
    service.execute(student, data),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const failed = results.find(
    (r) => r.status === "rejected",
  ) as PromiseRejectedResult;
  assert.equal(failed.reason.status, 409);
  await assert.rejects(
    service.execute(student, { ...data, action: "saveEvaluationDrafts" }),
    { status: 409 },
  );
  const stored = (await repo.findById(a.id))!.assignment;
  assert.equal(stored.evaluationSubmissions!.length, 1);
  assert.equal(stored.comparisons!.length, data.answers.length);
});
