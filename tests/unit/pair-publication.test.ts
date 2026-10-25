import test from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  demoTeacher,
  demoStudent,
} from "@/features/assignments/data/demo-data";
import { createAssignment } from "@/features/assignments/domain/create-assignment";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import { visibleAssignment } from "@/features/assignments/domain/assignment-visibility";
import { previewRegeneration } from "@/features/pairwise/domain/regeneration";
import { AssignmentService } from "@/features/assignments/server/assignment-service";
import { FakeAssignmentRepository } from "../fakes/fake-assignment-repository";
import type { Assignment } from "@/features/assignments/types";
import type { NotificationEvent } from "@/features/notifications/types";

function fixture() {
  const a = seed()[0];
  a.pairwiseRequired = true;
  a.groups = [1, 2, 3].map((n) => ({
    id: `g${n}`,
    name: `Group ${n}`,
    members: [1, 2, 3, 4].map((m) => ({
      id: n === 1 && m === 1 ? demoStudent.id : `s${n}-${m}`,
      name: `Student ${n}-${m}`,
    })),
  }));
  a.students = a.groups.flatMap((g) => g.members);
  return a;
}

test("new assignments require pair publication even when client requests legacy voting", () => {
  const a = createAssignment(
    {
      title: "New",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      pairwiseRequired: false,
    },
    demoTeacher,
  );
  assert.equal(a.pairwiseRequired, true);
  assert.equal(a.pairs, undefined);
  const prepared = fixture();
  assert.throws(
    () => applyAssignmentCommand(prepared, demoTeacher, "start", {}),
    { status: 409 },
  );
  assert.equal(prepared.status, "draft");
  assert.equal(prepared.pairs, undefined);
});

test("confirmed publication stores eligible per-student pairs, randomized positions and no phantom history", () => {
  const a = fixture();
  const plan = previewRegeneration(a, "both");
  assert.equal(plan.coverage, 4);
  applyAssignmentCommand(a, demoTeacher, "start", {
    expectedGeneration: 0,
    previewToken: plan.token,
  });
  assert.equal(a.status, "active");
  assert.equal(a.pairGeneration, 1);
  assert.deepEqual(
    a.pairs?.map((p) => ({ ...p, created_at: "" })),
    plan.pairs.map((p) => ({ ...p, created_at: "" })),
  );
  assert.equal(a.pairHistory?.length ?? 0, 0);
  for (const group of a.groups)
    for (const member of group.members) {
      const own = visibleAssignment(a, member.id).pairs!;
      assert(own.every((p) => p.evaluator_user_id === member.id));
      const groupPairs = own.filter((p) => p.side === "GROUP");
      assert.equal(groupPairs.length, 3);
      assert(
        groupPairs.every(
          (p) => p.item_a_id !== group.id && p.item_b_id !== group.id,
        ),
      );
      assert.equal(new Set(groupPairs.map((p) => p.criterion_id)).size, 3);
      assert(
        own.every(
          (p) =>
            p.display_left_item_id === p.item_a_id ||
            p.display_left_item_id === p.item_b_id,
        ),
      );
    }
  assert.throws(
    () =>
      applyAssignmentCommand(a, demoTeacher, "start", {
        expectedGeneration: 0,
        previewToken: plan.token,
      }),
    { status: 409 },
  );
});

test("publication rejects stale previews, ineligible owners, expired deadlines and infeasible two-group layouts without mutation", () => {
  for (const mutation of [
    "roster",
    "questions",
    "coverage",
    "deadline",
    "owner",
    "groups",
  ] as const) {
    const a = fixture();
    const plan = previewRegeneration(a, "both");
    if (mutation === "roster") a.groups[0].members[0].name = "Updated";
    if (mutation === "questions") a.questions.push("New criterion");
    if (mutation === "coverage") a.targetCoverage = 1;
    if (mutation === "deadline") a.deadline = "2020-01-01T00:00:00Z";
    if (mutation === "groups") a.groups.pop();
    const before = structuredClone(a);
    assert.throws(() =>
      applyAssignmentCommand(
        a,
        mutation === "owner" ? demoStudent : demoTeacher,
        "start",
        { expectedGeneration: 0, previewToken: plan.token },
      ),
    );
    assert.deepEqual(a, before);
  }
});

test("concurrent first publications commit once and emit assignment-opened instead of regenerated", async () => {
  const a = fixture();
  class Repository extends FakeAssignmentRepository {
    committed: NotificationEvent[] = [];
    async update(next: Assignment, version: number, event?: NotificationEvent) {
      const saved = await super.update(next, version);
      if (saved && event) this.committed.push(event);
      return saved;
    }
  }
  const repository = new Repository([a]);
  const service = new AssignmentService(repository);
  const plan = previewRegeneration(a, "both");
  const input = {
    id: a.id,
    action: "start",
    expectedGeneration: 0,
    previewToken: plan.token,
  };
  const results = await Promise.allSettled([
    service.execute(demoTeacher, input),
    service.execute(demoTeacher, input),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  const stored = (await repository.findById(a.id))!.assignment;
  assert.equal(stored.pairGeneration, 1);
  assert.equal(stored.status, "active");
  assert.deepEqual(
    repository.committed.map((event) => event.kind),
    ["assignment_opened"],
  );
});
