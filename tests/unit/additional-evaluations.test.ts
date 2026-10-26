import test from "node:test";
import assert from "node:assert/strict";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";
import type { AssignmentRepository } from "@/features/assignments/server/assignment-repository";
import {
  assignAdditionalEvaluations,
  additionalCandidates,
} from "@/features/pairwise/domain/additional-evaluations";
import { previewRegeneration } from "@/features/pairwise/domain/regeneration";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import { AssignmentService } from "@/features/assignments/server/assignment-service";
import { FakeAssignmentRepository } from "../fakes/fake-assignment-repository";
import { visibleAssignment } from "@/features/assignments/domain/assignment-visibility";
import { deadlineReminder } from "@/features/notifications/domain/notification-policy";

const teacher: User = {
  id: "teacher",
  name: "Teacher",
  role: "teacher",
  email: "teacher@example.test",
};
function fixture() {
  const groups = [0, 1, 2].map((i) => ({
    id: `g${i}`,
    name: `Group ${i}`,
    members: [0, 1, 2, 3].map((j) => ({
      id: `s${i}${j}`,
      name: `Student ${i}${j}`,
    })),
  }));
  const a: Assignment = {
    id: "a",
    ownerId: teacher.id,
    title: "Test",
    description: "",
    subject: "",
    color: "mint",
    createdAt: new Date().toISOString(),
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: "draft",
    questions: ["Quality", "Teamwork"],
    groups,
    students: groups.flatMap((g) => g.members),
    votes: [],
    targetCoverage: 1,
    maxWorkload: 8,
  };
  const plan = previewRegeneration(a, "both");
  a.pairs = plan.pairs;
  a.pairGeneration = plan.generation;
  a.status = "active";
  const pair = a.pairs.find((p) => p.side === "GROUP")!;
  const input = {
    pairId: pair.id,
    count: 1,
    expectedGeneration: a.pairGeneration,
    expectedAssignedCount: 1,
  };
  return { a, pair, input };
}

test("additional evaluations append distinct eligible students with randomized display and preserve all previous work", () => {
  const { a, pair, input } = fixture();
  a.comparisons = [
    {
      id: "answer",
      pair_assignment_id: pair.id,
      evaluator_user_id: pair.evaluator_user_id,
      choice: 1,
      status: "SUBMITTED",
      saved_at: a.createdAt,
    },
  ];
  a.evaluationDrafts = [];
  a.evaluationSubmissions = [];
  a.pairHistory = [];
  const before = structuredClone(a);
  const added = assignAdditionalEvaluations(
    a,
    teacher,
    { ...input, count: 2 },
    () => 0.9,
  );
  assert.equal(added.length, 2);
  assert.equal(new Set(added.map((p) => p.evaluator_user_id)).size, 2);
  assert.equal(new Set(a.pairs!.map((p) => p.id)).size, a.pairs!.length);
  assert.deepEqual(a.pairs!.slice(0, -2), before.pairs);
  for (const p of added) {
    assert.equal(p.source, "INSTRUCTOR_EXTRA");
    assert.equal(p.generation, before.pairGeneration);
    assert.equal(p.criterion_id, pair.criterion_id);
    assert.equal(p.display_left_item_id, pair.item_b_id);
    assert.notEqual(p.evaluator_user_id, pair.evaluator_user_id);
    const group = a.groups.find((g) =>
      g.members.some((m) => m.id === p.evaluator_user_id),
    )!;
    assert.notEqual(group.id, pair.item_a_id);
    assert.notEqual(group.id, pair.item_b_id);
  }
  const { pairs: _old, ...oldRest } = before;
  const { pairs: _new, ...newRest } = a;
  assert.deepEqual(newRest, oldRest);
});

test("additional assignments reject roles, lifecycle, stale generations, counts and unknown pairs without mutations", () => {
  const { a, input } = fixture();
  const before = structuredClone(a);
  for (const user of [
    { ...teacher, id: "other" },
    { ...teacher, role: "student" as const },
  ])
    assert.throws(() => assignAdditionalEvaluations(a, user, input), {
      status: 403,
    });
  for (const status of ["draft", "closed", "finalized"] as const)
    assert.throws(
      () => assignAdditionalEvaluations({ ...a, status }, teacher, input),
      { status: 409 },
    );
  for (const deadline of ["2020-01-01", "invalid"])
    assert.throws(
      () => assignAdditionalEvaluations({ ...a, deadline }, teacher, input),
      { status: 409 },
    );
  assert.throws(
    () =>
      assignAdditionalEvaluations(
        { ...a, pairingPaused: true },
        teacher,
        input,
      ),
    { status: 409 },
  );
  assert.throws(
    () =>
      assignAdditionalEvaluations(a, teacher, {
        ...input,
        expectedGeneration: 0,
      }),
    { status: 409 },
  );
  assert.throws(
    () =>
      assignAdditionalEvaluations(a, teacher, {
        ...input,
        expectedAssignedCount: 0,
      }),
    { status: 409 },
  );
  assert.throws(
    () =>
      assignAdditionalEvaluations(a, teacher, { ...input, pairId: "missing" }),
    { status: 404 },
  );
  for (const count of [0, -1, 1.5, 101, "1", null, NaN, Infinity])
    assert.throws(
      () => assignAdditionalEvaluations(a, teacher, { ...input, count }),
      { status: 400 },
    );
  assert.throws(
    () => assignAdditionalEvaluations(a, teacher, { ...input, count: 4 }),
    { status: 409 },
  );
  assert.deepEqual(a, before);
});

test("eligibility excludes reversed duplicates, exhausted workload, outsiders and individual self/other-group candidates", () => {
  const { a, pair, input } = fixture();
  const candidate = additionalCandidates(a, pair)[0];
  a.pairs!.push({
    ...pair,
    id: "reversed",
    item_a_id: pair.item_b_id,
    item_b_id: pair.item_a_id,
    evaluator_user_id: candidate.id,
  });
  assert.ok(!additionalCandidates(a, pair).some((m) => m.id === candidate.id));
  a.maxWorkload = 1;
  assert.ok(additionalCandidates(a, pair).length > 0);
  const remaining = additionalCandidates(a, pair);
  for (const m of remaining)
    a.pairs!.push({
      ...pair,
      id: `load-${m.id}`,
      item_a_id: "other",
      evaluator_user_id: m.id,
    });
  assert.equal(additionalCandidates(a, pair).length, 0);
  assert.throws(
    () =>
      assignAdditionalEvaluations(a, teacher, {
        ...input,
        expectedAssignedCount: 2,
      }),
    { status: 409 },
  );
  const individual = a.pairs!.find((p) => p.side === "INDIVIDUAL")!;
  assert.equal(additionalCandidates(a, individual).length, 0); // Complete enumeration already assigned all eligible peers.
  a.pairs = a.pairs!.filter((p) => p.id === individual.id);
  a.maxWorkload = 8;
  const candidates = additionalCandidates(a, individual);
  assert.equal(candidates.length, 1);
  assert.ok(
    ![
      individual.item_a_id,
      individual.item_b_id,
      individual.evaluator_user_id,
    ].includes(candidates[0].id),
  );
  a.students = a.students.filter((s) => s.id !== candidates[0].id);
  assert.equal(additionalCandidates(a, individual).length, 0);
});

test("commands retain generation, expose extra tasks only to recipients and produce deadline reminders for new tasks", () => {
  const { a, pair, input } = fixture();
  const updated = applyAssignmentCommand(a, teacher, "assignAdditional", input);
  const extra = updated.pairs!.at(-1)!;
  const recipient = visibleAssignment(updated, extra.evaluator_user_id);
  assert.ok(recipient.pairs!.some((p) => p.id === extra.id));
  assert.ok(
    recipient.pairs!.every(
      (p) => p.evaluator_user_id === extra.evaluator_user_id,
    ),
  );
  assert.ok(
    !visibleAssignment(updated, pair.evaluator_user_id).pairs!.some(
      (p) => p.id === extra.id,
    ),
  );
  assert.equal(
    deadlineReminder(updated, extra.evaluator_user_id)?.kind,
    "deadline_reminder",
  );
});

test("optimistic retries prevent duplicate extra tasks and atomically pass only selected notification recipients", async () => {
  const { a, input } = fixture();
  const repository = new FakeAssignmentRepository([a]);
  const original = repository.update.bind(repository);
  const writes: Parameters<AssignmentRepository["update"]>[] = [];
  repository.update = async (
    ...args: Parameters<AssignmentRepository["update"]>
  ) => {
    const saved = await original(args[0], args[1]);
    if (saved) writes.push(structuredClone(args));
    return saved;
  };
  const service = new AssignmentService(repository);
  const request = { ...input, action: "assignAdditional", id: a.id };
  const results = await Promise.allSettled([
    service.execute(teacher, request),
    service.execute(teacher, request),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const failure = results.find(
    (r) => r.status === "rejected",
  ) as PromiseRejectedResult;
  assert.equal(failure.reason.status, 409);
  const saved = (await repository.findById(a.id))!.assignment;
  assert.equal(saved.pairs!.length, a.pairs!.length + 1);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][2]!.kind, "additional_evaluation");
  assert.deepEqual(writes[0][2]!.recipientIds, [
    saved.pairs!.at(-1)!.evaluator_user_id,
  ]);
  assert.equal(writes[0][2]!.scope, input.pairId);
  assert.equal(writes[0][2]!.generation, a.pairGeneration);
});

test("extra tasks reject stale browser batch saves while preserving previous submissions and allowing a refreshed revision", () => {
  const { a, pair, input } = fixture();
  const id = additionalCandidates(a, pair)[0].id;
  const user: User = {
    id,
    name: id,
    role: "student",
    email: `${id}@example.test`,
  };
  const ids = a
    .pairs!.filter((p) => p.side === "GROUP" && p.evaluator_user_id === id)
    .map((p) => p.id);
  const batch = {
    side: "GROUP",
    expectedGeneration: a.pairGeneration,
    expectedRevision: 0,
    expectedPairIds: ids,
    answers: [],
  };
  if (ids.length) applyAssignmentCommand(a, user, "submitEvaluation", batch);
  const previous = structuredClone(a.evaluationSubmissions);
  assignAdditionalEvaluations(a, teacher, input, () => 0.999);
  // Select the exact recipient rather than assuming random selection.
  const extra = a.pairs!.at(-1)!;
  const recipient = { ...user, id: extra.evaluator_user_id };
  const oldIds = a
    .pairs!.slice(0, -1)
    .filter((p) => p.side === "GROUP" && p.evaluator_user_id === recipient.id)
    .map((p) => p.id);
  const revision =
    a.evaluationSubmissions?.filter(
      (s) => s.side === "GROUP" && s.evaluatorId === recipient.id,
    ).length ?? 0;
  const request = {
    ...batch,
    expectedRevision: revision,
    expectedPairIds: oldIds,
  };
  for (const action of ["saveEvaluationDrafts", "submitEvaluation"])
    assert.throws(() => applyAssignmentCommand(a, recipient, action, request), {
      status: 409,
    });
  assert.deepEqual(a.evaluationSubmissions, previous);
  applyAssignmentCommand(a, recipient, "submitEvaluation", {
    ...request,
    expectedPairIds: [...oldIds, extra.id],
    answers: [{ pairId: extra.id, choice: 6 }],
  });
  assert.equal(a.comparisons!.at(-1)!.pair_assignment_id, extra.id);
  assert.equal(a.evaluationSubmissions!.at(-1)!.revision, revision + 1);
});
