import test from "node:test";
import assert from "node:assert/strict";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";
import { previewRegeneration } from "@/features/pairwise/domain/regeneration";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import { visibleAssignment } from "@/features/assignments/domain/assignment-visibility";
import { AssignmentService } from "@/features/assignments/server/assignment-service";
import { FakeAssignmentRepository } from "../fakes/fake-assignment-repository";
import { deadlineReminder } from "@/features/notifications/domain/notification-policy";
import type { NotificationEvent } from "@/features/notifications/types";

const teacher: User = {
  id: "teacher",
  name: "Teacher",
  role: "teacher",
  email: "teacher@example.test",
};
function fixture(sizes = [3, 3, 3]): Assignment {
  const groups = sizes.map((size, i) => ({
    id: `g${i}`,
    name: `Group ${i}`,
    members: Array.from({ length: size }, (_, j) => ({
      id: `s${i}-${j}`,
      name: `Student ${i}-${j}`,
    })),
  }));
  return {
    id: "a",
    ownerId: teacher.id,
    code: "123456",
    title: "Test",
    description: "",
    subject: "",
    color: "mint",
    createdAt: "2026-01-01T00:00:00Z",
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: "draft",
    questions: ["Quality", "Teamwork"],
    groups,
    students: groups.flatMap((g) => g.members),
    votes: [],
    maxWorkload: 8,
    targetCoverage: 5,
  };
}
const student = (id = "s0-0"): User => ({
  id,
  name: id,
  email: `${id}@example.test`,
  role: "student",
});
test("pair configuration validates role, lifecycle, bounds and future deadline", () => {
  const a = fixture();
  const input = {
    reason: "Adjust workload",
    expectedGeneration: 0,
    targetCoverage: 3,
    maxWorkload: 6,
    deadline: new Date(Date.now() + 3600000).toISOString(),
  };
  assert.throws(
    () => applyAssignmentCommand(a, student(), "configurePairs", input),
    { status: 403 },
  );
  for (const invalid of [
    { targetCoverage: 0 },
    { maxWorkload: 1.5 },
    { maxWorkload: 101 },
    { deadline: "invalid" },
    { deadline: "2020-01-01" },
  ])
    assert.throws(() =>
      applyAssignmentCommand(a, teacher, "configurePairs", {
        ...input,
        ...invalid,
      }),
    );
  applyAssignmentCommand(a, teacher, "configurePairs", input);
  assert.equal(a.targetCoverage, 3);
  assert.equal(a.maxWorkload, 6);
  assert.equal(a.deadline, input.deadline);
  a.status = "active";
  assert.throws(
    () => applyAssignmentCommand(a, teacher, "configurePairs", input),
    { status: 409 },
  );
});
test("finalized work must reopen before unpublish; archived owner snapshots never leak to students", () => {
  const a = publish(fixture());
  a.status = "closed";
  applyAssignmentCommand(a, teacher, "finalize", {});
  assert.ok(a.finalizedSnapshot!.inputs.pairs!.length > 0);
  assert.throws(
    () =>
      applyAssignmentCommand(a, teacher, "unpublishPairs", {
        reason: "Change",
        expectedGeneration: 1,
      }),
    { status: 409 },
  );
  applyAssignmentCommand(a, teacher, "reopen", { reason: "Correction" });
  applyAssignmentCommand(a, teacher, "unpublishPairs", {
    reason: "Correction",
    expectedGeneration: 1,
  });
  const oldName = a.groups[0].name;
  a.groups[0].name = "New group name";
  publish(a);
  const h = a.pairHistory!.at(-1)!;
  assert.ok(h.finalizedSnapshot!.inputs.pairs!.length > 0);
  assert.equal(h.groups[0].name, oldName);
  assert.equal(a.finalizedSnapshot, undefined);
  const own = visibleAssignment(a, "s0-0");
  assert.equal(own.pairHistory!.at(-1)!.finalizedSnapshot, undefined);
  assert.equal(own.pairHistory!.at(-1)!.scoreOverrides, undefined);
  assert.equal(own.pairingSnapshot, undefined);
});
test("preview rejects invalid scope, duplicate roster and expired deadlines; configuration invalidates preview", () => {
  const a = fixture();
  assert.throws(() => previewRegeneration(a, "invalid" as "both"));
  const p = previewRegeneration(a, "both");
  a.maxWorkload = 7;
  assert.throws(
    () =>
      applyAssignmentCommand(a, teacher, "regeneratePairs", {
        reason: "Change",
        scope: "both",
        expectedGeneration: 0,
        previewToken: p.token,
      }),
    { status: 409 },
  );
  a.groups[1].members.push(a.groups[0].members[0]);
  assert.throws(() => previewRegeneration(a, "both"), /เพียงกลุ่มเดียว/);
  a.deadline = "2020-01-01";
  assert.throws(() => previewRegeneration(a, "both"), /เวลาในอนาคต/);
});
test("comparison submission rejects invalid choices and closed/expired sessions without creating answers", () => {
  const a = publish(fixture());
  const pair = a.pairs!.find((p) => p.evaluator_user_id === "s0-0")!;
  for (const choice of [0, 7, 1.5, "6", null])
    assert.throws(() =>
      applyAssignmentCommand(a, student(), "submitPair", {
        pairId: pair.id,
        choice,
        expectedGeneration: 1,
      }),
    );
  a.deadline = "2020-01-01";
  assert.throws(
    () =>
      applyAssignmentCommand(a, student(), "submitPair", {
        pairId: pair.id,
        choice: 6,
        expectedGeneration: 1,
      }),
    { status: 403 },
  );
  assert.equal(a.comparisons!.length, 0);
});
function publish(a: Assignment, scope = "both") {
  const p = previewRegeneration(a, scope as "both");
  return applyAssignmentCommand(a, teacher, "regeneratePairs", {
    scope,
    reason: "Roster updated",
    expectedGeneration: a.pairGeneration ?? 0,
    previewToken: p.token,
  });
}
test("preview produces persisted deterministic pairs, exact balanced coverage and eligible evaluators", () => {
  for (const sizes of [
    [3, 3, 3],
    [2, 3, 4, 5],
    [1, 1, 1, 1, 1],
  ]) {
    const a = fixture(sizes);
    const p = previewRegeneration(a, "both");
    assert.deepEqual(p, previewRegeneration(a, "both"));
    assert.equal(a.pairs, undefined);
    const coverage = new Map<string, number>();
    const workloads = new Map<string, number>();
    for (const pair of p.pairs) {
      assert.notEqual(pair.item_a_id, pair.item_b_id);
      assert.ok(
        [pair.item_a_id, pair.item_b_id].includes(pair.display_left_item_id),
      );
      const group = a.groups.find((g) =>
        g.members.some((m) => m.id === pair.evaluator_user_id),
      )!;
      if (pair.side === "GROUP") {
        assert.ok(![pair.item_a_id, pair.item_b_id].includes(group.id));
        const key = JSON.stringify([
          pair.criterion_id,
          pair.item_a_id,
          pair.item_b_id,
        ]);
        coverage.set(key, (coverage.get(key) ?? 0) + 1);
      } else {
        assert.ok(
          ![pair.item_a_id, pair.item_b_id].includes(pair.evaluator_user_id),
        );
        assert.ok(group.members.some((m) => m.id === pair.item_a_id));
        assert.ok(group.members.some((m) => m.id === pair.item_b_id));
      }
      const key = pair.evaluator_user_id + pair.criterion_id;
      workloads.set(key, (workloads.get(key) ?? 0) + 1);
    }
    assert.deepEqual(new Set(coverage.values()), new Set([p.coverage]));
    assert.ok([...workloads.values()].every((count) => count <= 8));
    assert.equal(new Set(p.pairs.map((pair) => pair.id)).size, p.pairs.length);
  }
});
test("individual pairs are exhaustive, disabled for small groups/zero score, and never silently truncated", () => {
  const a = fixture([2, 3, 4]);
  const p = previewRegeneration(a, "individual");
  assert.equal(p.pairs.length, (3 + 12) * 2);
  a.maxWorkload = 2;
  assert.throws(() => previewRegeneration(a, "individual"), /เกิน workload/);
  a.individualMaxScore = 0;
  assert.throws(() => previewRegeneration(a, "individual"), /ไม่มีคู่/);
  assert.throws(
    () => previewRegeneration(fixture([2, 2]), "group"),
    /ไม่สามารถสร้างคู่กลุ่ม/,
  );
});
test("regeneration requires owner, reason, Draft, current generation and an unchanged preview", () => {
  const a = fixture();
  const p = previewRegeneration(a, "both");
  const input = {
    scope: "both",
    reason: "Change",
    expectedGeneration: 0,
    previewToken: p.token,
  };
  assert.throws(
    () =>
      applyAssignmentCommand(
        structuredClone(a),
        student(),
        "regeneratePairs",
        input,
      ),
    { status: 403 },
  );
  assert.throws(
    () =>
      applyAssignmentCommand(
        structuredClone(a),
        { ...teacher, id: "other" },
        "regeneratePairs",
        input,
      ),
    { status: 403 },
  );
  assert.throws(() =>
    applyAssignmentCommand(structuredClone(a), teacher, "regeneratePairs", {
      ...input,
      reason: " ",
    }),
  );
  a.groups[0].members[0].name = "Changed";
  assert.throws(
    () => applyAssignmentCommand(a, teacher, "regeneratePairs", input),
    { status: 409 },
  );
  a.status = "active";
  assert.throws(() => previewRegeneration(a, "both"), { status: 409 });
  a.status = "finalized";
  assert.throws(
    () => applyAssignmentCommand(a, teacher, "unpublishPairs", input),
    { status: 409 },
  );
});
test("unpublish pauses submissions, archives legacy ballots and new generations reject stale browser submissions", () => {
  const a = fixture();
  a.status = "active";
  a.votes = [
    { userId: "s0-0", groupId: "g1", scores: [6, 4], createdAt: a.createdAt },
  ];
  applyAssignmentCommand(a, teacher, "unpublishPairs", {
    reason: "Change",
    expectedGeneration: 0,
  });
  assert.equal(a.status, "draft");
  assert.throws(() => applyAssignmentCommand(a, teacher, "start", {}), {
    status: 409,
  });
  publish(a);
  assert.equal(a.status, "active");
  assert.equal(a.pairGeneration, 1);
  assert.equal(a.votes.length, 0);
  assert.deepEqual(a.pairHistory![0].votes[0].scores, [6, 4]);
  const pair = a.pairs!.find((p) => p.evaluator_user_id === "s0-0")!;
  applyAssignmentCommand(a, student(), "submitPair", {
    pairId: pair.id,
    choice: 6,
    expectedGeneration: 1,
    timeOnTaskMs: 4200,
  });
  assert.equal(a.comparisons![0].choice, 6);
  assert.throws(
    () =>
      applyAssignmentCommand(a, student(), "submitPair", {
        pairId: pair.id,
        choice: 5,
        expectedGeneration: 1,
      }),
    { status: 409 },
  );
  assert.throws(
    () =>
      applyAssignmentCommand(a, student("s1-0"), "submitPair", {
        pairId: pair.id,
        choice: 6,
        expectedGeneration: 1,
      }),
    { status: 403 },
  );
  assert.throws(
    () =>
      applyAssignmentCommand(a, student(), "vote", {
        groupId: "g1",
        scores: [6, 6],
      }),
    { status: 409 },
  );
  applyAssignmentCommand(a, teacher, "unpublishPairs", {
    reason: "Again",
    expectedGeneration: 1,
  });
  publish(a);
  assert.equal(a.pairGeneration, 2);
  assert.equal(a.comparisons!.length, 0);
  assert.equal(a.pairHistory![1].comparisons[0].choice, 6);
  assert.throws(
    () =>
      applyAssignmentCommand(a, student(), "submitPair", {
        pairId: pair.id,
        choice: 6,
        expectedGeneration: 1,
      }),
    { status: 409 },
  );
});
test("partial regeneration retains the other side; roster changes require regenerating both", () => {
  const a = publish(fixture());
  const p = a.pairs!.find((p) => p.side === "INDIVIDUAL")!;
  applyAssignmentCommand(a, student(p.evaluator_user_id), "submitPair", {
    pairId: p.id,
    choice: 6,
    expectedGeneration: 1,
  });
  applyAssignmentCommand(a, teacher, "unpublishPairs", {
    reason: "Groups only",
    expectedGeneration: 1,
  });
  publish(a, "group");
  assert.ok(a.pairs!.some((pair) => pair.id === p.id));
  assert.equal(a.comparisons![0].choice, 6);
  applyAssignmentCommand(a, teacher, "unpublishPairs", {
    reason: "Roster",
    expectedGeneration: 2,
  });
  a.groups[0].members[0].name = "New roster";
  assert.throws(() => previewRegeneration(a, "group"), /ทั้งสองส่วน/);
});
test("students only receive own pairs and history, with anonymous aggregate results after closure", () => {
  const a = publish(fixture());
  for (const pair of a.pairs!.slice(0, 5))
    applyAssignmentCommand(a, student(pair.evaluator_user_id), "submitPair", {
      pairId: pair.id,
      choice: 6,
      expectedGeneration: 1,
    });
  applyAssignmentCommand(a, teacher, "unpublishPairs", {
    reason: "Change",
    expectedGeneration: 1,
  });
  publish(a);
  a.status = "closed";
  const visible = visibleAssignment(a, "s0-0");
  assert.ok(visible.pairs!.every((p) => p.evaluator_user_id === "s0-0"));
  assert.ok(
    visible.pairHistory!.every((h) =>
      h.comparisons.every((c) => c.evaluator_user_id === "s0-0"),
    ),
  );
  assert.equal(visible.pairingReason, undefined);
  assert.equal(visible.pairingShape, undefined);
  assert.equal(visible.pairResult!.individualScore, null);
  assert.equal(visibleAssignment(a, teacher.id), a);
});
test("deadline reminders follow current pairs and generation, not legacy targets", () => {
  const a = publish(fixture());
  const first = deadlineReminder(a, "s0-0")!;
  assert.ok(first.key.endsWith(":generation:1"));
  for (const pair of a.pairs!.filter((p) => p.evaluator_user_id === "s0-0"))
    applyAssignmentCommand(a, student(), "submitPair", {
      pairId: pair.id,
      choice: 1,
      expectedGeneration: 1,
    });
  assert.equal(deadlineReminder(a, "s0-0"), undefined);
  a.status = "draft";
  publish(a);
  assert.notEqual(deadlineReminder(a, "s0-0")!.key, first.key);
});
test("service checks preview authorization and revalidates a generation conflict without duplicate events", async () => {
  class Repo extends FakeAssignmentRepository {
    events: NotificationEvent[] = [];
    async update(a: Assignment, v: number, e?: NotificationEvent) {
      const saved = await super.update(a, v);
      if (saved && e) this.events.push(e);
      return saved;
    }
  }
  const a = fixture();
  const repo = new Repo([a]);
  const legacyUser = { id: "legacy-voter", name: "Previous group member" };
  a.students.push(legacyUser);
  a.votes.push({
    userId: legacyUser.id,
    groupId: "g1",
    scores: [6, 4],
    createdAt: a.createdAt,
  });
  await repo.update(a, 0);
  const service = new AssignmentService(repo, () => "123456");
  await assert.rejects(() => service.previewPairs(student(), a.id, "both"), {
    status: 403,
  });
  const preview = await service.previewPairs(teacher, a.id, "both");
  assert.ok(preview.affectedStudentIds.includes(legacyUser.id));
  const input = {
    id: a.id,
    action: "regeneratePairs",
    scope: "both",
    reason: "Roster update",
    expectedGeneration: 0,
    previewToken: preview.token,
  };
  const results = await Promise.allSettled([
    service.execute(teacher, input),
    service.execute(teacher, input),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(repo.events.length, 1);
  assert.equal(repo.events[0].kind, "pairs_regenerated");
  assert.equal(repo.events[0].reason, "Roster update");
  assert.equal(repo.events[0].recipientIds!.length, 10);
  assert.ok(repo.events[0].recipientIds!.includes(legacyUser.id));
});
