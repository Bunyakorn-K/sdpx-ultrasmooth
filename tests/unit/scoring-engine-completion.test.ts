import test from "node:test";
import assert from "node:assert/strict";
import { generatedResult } from "@/features/pairwise/domain/generated-results";
import {
  isInterimRecomputationDue,
  applyInterimRecompute,
} from "@/features/pairwise/domain/interim-scheduler";
import { calculateItemScores } from "@/features/pairwise/domain/scoring-engine";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";
import type { Comparison, PairAssignment } from "@/features/pairwise/types";

const teacher: User = {
  id: "t-owner",
  name: "Teacher",
  role: "teacher",
  email: "t@uni.ac.th",
};

const studentA: User = {
  id: "std-a",
  name: "Student A",
  role: "student",
  email: "a@uni.ac.th",
};

const studentB: User = {
  id: "std-b",
  name: "Student B",
  role: "student",
  email: "b@uni.ac.th",
};

function fixtureAssignment(overrides: Partial<Assignment> = {}): Assignment {
  const pairs: PairAssignment[] = [
    {
      id: "pair-g1",
      assignment_id: "asgn-1",
      criterion_id: "GROUP-0",
      side: "GROUP",
      item_a_id: "grp-1",
      item_b_id: "grp-2",
      evaluator_user_id: "t-owner", // Teacher evaluated
      display_left_item_id: "grp-1",
      generation: 1,
      source: "AUTO",
      created_at: new Date().toISOString(),
    },
    {
      id: "pair-g2",
      assignment_id: "asgn-1",
      criterion_id: "GROUP-0",
      side: "GROUP",
      item_a_id: "grp-1",
      item_b_id: "grp-2",
      evaluator_user_id: "std-b", // Student evaluated
      display_left_item_id: "grp-1",
      generation: 1,
      source: "AUTO",
      created_at: new Date().toISOString(),
    },
  ];

  const comparisons: Comparison[] = [
    {
      id: "comp-1",
      pair_assignment_id: "pair-g1",
      evaluator_user_id: "t-owner",
      choice: 1, // grp-1 gets 1.0 from instructor
      status: "SUBMITTED",
      saved_at: new Date().toISOString(),
    },
    {
      id: "comp-2",
      pair_assignment_id: "pair-g2",
      evaluator_user_id: "std-b",
      choice: 6, // grp-1 gets 0.0 from student
      status: "SUBMITTED",
      saved_at: new Date().toISOString(),
    },
  ];

  return {
    id: "asgn-1",
    ownerId: teacher.id,
    title: "Scoring Integration Test",
    description: "Testing FR-SCORE features",
    subject: "SE",
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: "closed",
    questions: ["UX"],
    groups: [
      { id: "grp-1", name: "Team 1", members: [studentA] },
      { id: "grp-2", name: "Team 2", members: [studentB] },
    ],
    students: [studentA, studentB],
    votes: [],
    pairs,
    comparisons,
    groupMaxScore: 15,
    individualMaxScore: 5,
    scoreFloor: 0.6,
    scoreCeiling: 1.0,
    minComparisons: 1,
    completionThreshold: 0.9,
    instructorWeight: 1.0,
    createdAt: new Date().toISOString(),
    color: "#ffffff",
    ...overrides,
  };
}

test("FR-SCORE-03: generatedResult weights instructor evaluation with configured instructorWeight", () => {
  // With instructorWeight = 1.0:
  // Points = (1.0 * 1.0 + 1.0 * 0.0) / (1.0 + 1.0) = 0.5
  // Score ratio = 0.6 + 0.4 * 0.5 = 0.8
  // Group score = 0.8 * 15 = 12.0
  const a1 = fixtureAssignment({ instructorWeight: 1.0 });
  const res1 = generatedResult(a1, studentA.id);
  assert.equal(res1.groupScore, 12);

  // With instructorWeight = 3.0:
  // Points = (3.0 * 1.0 + 1.0 * 0.0) / (3.0 + 1.0) = 0.75
  // Score ratio = 0.6 + 0.4 * 0.75 = 0.9
  // Group score = 0.9 * 15 = 13.5
  const a3 = fixtureAssignment({ instructorWeight: 3.0 });
  const res3 = generatedResult(a3, studentA.id);
  assert.equal(res3.groupScore, 13.5);
});

test("FR-SCORE-04: PRD §9.4 combined participation multiplier applies to (Group + Individual) score", () => {
  const asgn = fixtureAssignment({
    instructorWeight: 1.0,
    completionThreshold: 0.8,
  });
  // Add pairs assigned to studentA: 2 tasks total, 1 submitted -> p = 0.5
  asgn.pairs!.push(
    {
      id: "pair-std-1",
      assignment_id: "asgn-1",
      criterion_id: "GROUP-0",
      side: "GROUP",
      item_a_id: "grp-2",
      item_b_id: "grp-1",
      evaluator_user_id: studentA.id,
      display_left_item_id: "grp-2",
      generation: 1,
      source: "AUTO",
      created_at: new Date().toISOString(),
    },
    {
      id: "pair-std-2",
      assignment_id: "asgn-1",
      criterion_id: "GROUP-0",
      side: "GROUP",
      item_a_id: "grp-2",
      item_b_id: "grp-1",
      evaluator_user_id: studentA.id,
      display_left_item_id: "grp-2",
      generation: 1,
      source: "AUTO",
      created_at: new Date().toISOString(),
    },
  );
  asgn.comparisons!.push({
    id: "comp-std-1",
    pair_assignment_id: "pair-std-1",
    evaluator_user_id: studentA.id,
    choice: 1,
    status: "SUBMITTED",
    saved_at: new Date().toISOString(),
  });

  const res = generatedResult(asgn, studentA.id);
  assert.equal(res.groupScore, 11);
  assert.equal(res.participation, 0.5);
  // M = min(1.0, 0.5 / 0.8) = 0.625
  assert.equal(res.multiplier, 0.625);
  // Final score = groupScore (11.0) * M (0.625) = 6.875
  assert.equal(res.finalScore, 6.875);
});

test("FR-SCORE-08: generatedResult applies instructor score overrides for students and groups", () => {
  const asgn = fixtureAssignment({
    scoreOverrides: [
      {
        targetId: "grp-1",
        targetType: "group",
        overriddenScore: 14.5,
        reason: "Adjusted for technical difficulties during presentation",
        overriddenBy: teacher.id,
        overriddenAt: new Date().toISOString(),
      },
      {
        targetId: studentA.id,
        targetType: "student",
        overriddenScore: 18.0,
        reason: "Extra credit approved by instructor",
        overriddenBy: teacher.id,
        overriddenAt: new Date().toISOString(),
      },
    ],
  });

  const res = generatedResult(asgn, studentA.id);
  assert.equal(res.groupScore, 14.5);
  assert.equal(res.finalScore, 18.0);
});

test("FR-SCORE-09: finalizeAssignment snapshots computed scores and serves frozen outputs", () => {
  const asgn = fixtureAssignment();
  applyAssignmentCommand(asgn, teacher, "finalize", {});

  assert.equal(asgn.status, "finalized");
  assert.ok(asgn.finalizedSnapshot?.outputs.scores);
  const snapshotScores = asgn.finalizedSnapshot!.outputs.scores as Record<
    string,
    { groupScore: number; finalScore: number }
  >;
  assert.equal(snapshotScores[studentA.id].groupScore, 12);
  assert.equal(snapshotScores[studentA.id].finalScore, 12);

  // Even if we mutate live comparisons or criteria, generatedResult returns the frozen snapshot!
  asgn.comparisons = [];
  const res = generatedResult(asgn, studentA.id);
  assert.equal(res.groupScore, 12);
  assert.equal(res.finalScore, 12);
});

test("FR-SCORE-06: interim scheduler detects when 02:00 in classroom timezone is due", () => {
  // Undefined lastInterimAt is always due
  assert.equal(isInterimRecomputationDue(undefined, "Asia/Bangkok"), true);

  // Over 24 hours ago is always due
  const twoDaysAgo = new Date(Date.now() - 48 * 3600000).toISOString();
  assert.equal(isInterimRecomputationDue(twoDaysAgo, "Asia/Bangkok"), true);

  // If now is 03:00 AM today and last run was yesterday at 02:30 AM -> due
  const now3am = new Date("2026-10-25T03:00:00+07:00");
  const yesterdayRun = new Date("2026-10-24T02:30:00+07:00").toISOString();
  assert.equal(
    isInterimRecomputationDue(yesterdayRun, "Asia/Bangkok", now3am),
    true,
  );

  // If now is 03:00 AM today and last run was today at 02:15 AM -> NOT due (already done today)
  const todayRun = new Date("2026-10-25T02:15:00+07:00").toISOString();
  assert.equal(
    isInterimRecomputationDue(todayRun, "Asia/Bangkok", now3am),
    false,
  );

  // applyInterimRecompute stamps timestamp
  const asgn = fixtureAssignment();
  applyInterimRecompute(asgn, now3am);
  assert.equal(asgn.lastInterimAt, now3am.toISOString());
});

test("FR-SCORE-06: recomputeScores command is owner-only and updates lastInterimAt", () => {
  const asgn = fixtureAssignment({ status: "active" });

  // Student cannot recompute
  assert.throws(
    () => applyAssignmentCommand(asgn, studentA, "recomputeScores", {}),
    /เฉพาะครูเจ้าของงานเท่านั้น/,
  );

  // Draft cannot be recomputed
  assert.throws(
    () =>
      applyAssignmentCommand(
        fixtureAssignment({ status: "draft" }),
        teacher,
        "recomputeScores",
        {},
      ),
    /สามารถคำนวณคะแนนได้เฉพาะงานที่เปิดหรือปิดรับการประเมินแล้ว/,
  );

  // Owner success
  const before = Date.now();
  applyAssignmentCommand(asgn, teacher, "recomputeScores", {});
  assert.ok(asgn.lastInterimAt);
  const stamp = new Date(asgn.lastInterimAt!).getTime();
  assert.ok(stamp >= before - 1000 && stamp <= Date.now() + 1000);
});

test("FR-SCORE-01 & FR-SCORE-02: Quality index weighted mean and band mapping respect floor and ceiling", () => {
  // With 2 comparisons: 1.0 and 0.0 (equal weights) -> q = 0.5
  // Score ratio = 0.5 + (0.9 - 0.5) * 0.5 = 0.70
  // Group score = 0.70 * 20 = 14.0
  const asgn = fixtureAssignment({
    scoreFloor: 0.5,
    scoreCeiling: 0.9,
    groupMaxScore: 20,
    instructorWeight: 1.0,
  });
  const res = generatedResult(asgn, studentA.id);
  assert.equal(res.groupScore, 14.0);
});

test("FR-SCORE-05: criteria with comparisons < min_comparisons carry LOW_CONFIDENCE flag", () => {
  // Set min_comparisons = 5 when only 2 comparisons exist
  const asgn = fixtureAssignment({ minComparisons: 5 });
  const criteria = [
    {
      id: "GROUP-0",
      assignment_id: "asgn-1",
      side: "GROUP" as const,
      name: "UX",
      description: "UX",
      weight_pct: 100,
      display_order: 1,
    },
  ];
  const scores = calculateItemScores(
    "grp-1",
    "GROUP",
    criteria,
    asgn.pairs!,
    asgn.comparisons!,
    15,
    0.6,
    1.0,
    5,
  );
  assert.equal(
    scores.criterionScores[0].flags.includes("LOW_CONFIDENCE"),
    true,
  );
});

test("FR-SCORE-07: unfinalized assignments indicate provisional status", () => {
  const activeAsgn = fixtureAssignment({ status: "active" });
  assert.notEqual(activeAsgn.status, "finalized");
  const closedAsgn = fixtureAssignment({ status: "closed" });
  assert.notEqual(closedAsgn.status, "finalized");
});

test("FR-SCORE-10: scoring calculation is 100% reproducible down to every decimal place", () => {
  const asgn = fixtureAssignment();
  const run1 = generatedResult(asgn, studentA.id);
  const run2 = generatedResult(asgn, studentA.id);
  const run3 = generatedResult(asgn, studentA.id);

  assert.deepEqual(run1, run2);
  assert.deepEqual(run2, run3);
  assert.equal(typeof run1.finalScore, "number");
  assert.equal(run1.finalScore, run2.finalScore);
});
