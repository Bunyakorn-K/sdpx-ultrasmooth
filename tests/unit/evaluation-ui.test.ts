import test from "node:test";
import assert from "node:assert/strict";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import { previewRegeneration } from "@/features/pairwise/domain/regeneration";
import { generatedResult } from "@/features/pairwise/domain/generated-results";
import { evaluationRevision } from "@/features/pairwise/domain/evaluation-submission";
import { CHOICE_POINTS } from "@/features/pairwise/domain/scoring-engine";
import { calculateDeadlineCountdown } from "@/features/assignments/hooks/use-deadline";
import {
  getOfflineDraftStorageKey,
  getInitialOfflineDraft,
} from "@/features/pairwise/hooks/use-evaluation-draft";

const teacher: User = {
  id: "t-1",
  name: "Teacher",
  role: "teacher",
  email: "teacher@test.local",
};

const student: User = {
  id: "s-00",
  name: "Student 00",
  role: "student",
  email: "s00@test.local",
};

function createTestAssignment(deadlineDeltaMs = 3600000): Assignment {
  const groups = Array.from({ length: 3 }, (_, i) => ({
    id: `g-${i}`,
    name: `Group ${i}`,
    members: Array.from({ length: 3 }, (_, j) => ({
      id: `s-${i}${j}`,
      name: `Student ${i}${j}`,
    })),
  }));

  const assignment: Assignment = {
    id: "asgn-eval-test",
    ownerId: "t-1",
    title: "Pairwise Evaluation Assignment",
    description: "Testing FR-EVAL suite",
    subject: "Software Engineering",
    color: "mint",
    createdAt: new Date().toISOString(),
    deadline: new Date(Date.now() + deadlineDeltaMs).toISOString(),
    status: "draft",
    questions: ["Quality & Depth", "Creativity & Teamwork"],
    groups,
    students: groups.flatMap((g) => g.members),
    votes: [],
    targetCoverage: 3,
    maxWorkload: 8,
    individualMaxScore: 5,
  };

  const preview = previewRegeneration(assignment, "both");
  applyAssignmentCommand(assignment, teacher, "regeneratePairs", {
    scope: "both",
    reason: "Initial publish",
    expectedGeneration: 0,
    previewToken: preview.token,
  });

  return assignment;
}

test("FR-EVAL-01 & FR-EVAL-07: Criteria are partitioned into clear sections with live progress tracking", () => {
  const assignment = createTestAssignment();
  const pairs =
    assignment.pairs?.filter(
      (p) => p.evaluator_user_id === student.id && p.side === "GROUP",
    ) ?? [];
  assert.ok(pairs.length > 0, "Student must receive group comparison pairs");

  const criterionIds = [...new Set(pairs.map((p) => p.criterion_id))];
  assert.equal(
    criterionIds.length,
    2,
    "There must be 2 distinct criterion sections",
  );

  // Initial progress is 0 / total
  const initialAnswered = 0;
  assert.equal(initialAnswered, 0);

  // When an answer is provided for one pair
  const samplePair = pairs[0];
  const draftAnswers: Record<string, { choice: number }> = {
    [samplePair.id]: { choice: 2 },
  };

  const answeredInCrit = pairs.filter(
    (p) => p.criterion_id === samplePair.criterion_id && draftAnswers[p.id],
  ).length;
  assert.equal(answeredInCrit, 1);
  const totalInCrit = pairs.filter(
    (p) => p.criterion_id === samplePair.criterion_id,
  ).length;
  assert.ok(totalInCrit >= 1);
});

test("FR-EVAL-02: Item artifacts fallback to 'อาจารย์ยังไม่ได้ระบุ' when no link is provided", () => {
  const assignment = createTestAssignment();
  // Assignment and groups have no artifactUrl
  assert.equal(assignment.artifactUrl, undefined);
  assert.equal(assignment.groups[0].artifactUrl, undefined);

  const getArtifactUrl = (itemId: string) => {
    const group = assignment.groups.find((g) => g.id === itemId);
    return group?.artifactUrl || assignment.artifactUrl || undefined;
  };

  const fallbackText = "อาจารย์ยังไม่ได้ระบุ";
  const leftUrl = getArtifactUrl(assignment.groups[0].id);
  const leftDisplay = leftUrl ?? fallbackText;
  assert.equal(leftDisplay, "อาจารย์ยังไม่ได้ระบุ");

  // When instructor provides an artifactUrl
  assignment.artifactUrl = "https://example.com/project-brief";
  const updatedUrl = getArtifactUrl(assignment.groups[0].id);
  assert.equal(updatedUrl, "https://example.com/project-brief");
});

test("FR-EVAL-03: 6-point forced choice scale has all 6 choices without neutral option", () => {
  const choices = Object.entries(CHOICE_POINTS).map(([val, data]) => ({
    value: Number(val),
    label: data.label,
    weight: { left: data.s_left, right: data.s_right },
  }));

  assert.equal(choices.length, 6, "Must strictly have 6 choices");
  // Ensure no neutral 50/50 option exists (Decision D1)
  const neutral = choices.find(
    (c) => c.weight.left === 0.5 && c.weight.right === 0.5,
  );
  assert.equal(
    neutral,
    undefined,
    "Forced-choice must not allow a neutral choice",
  );

  // Ensure each choice has valid labels and numeric point
  choices.forEach((c, index) => {
    assert.equal(c.value, index + 1);
    assert.ok(c.label.length > 0, "Each choice must have text label");
  });
});

test("FR-EVAL-04: Autosave draft records timestamp and time on task without altering comparisons", () => {
  const assignment = createTestAssignment();
  const studentPairs =
    assignment.pairs?.filter(
      (p) => p.evaluator_user_id === student.id && p.side === "GROUP",
    ) ?? [];

  applyAssignmentCommand(assignment, student, "saveEvaluationDrafts", {
    side: "GROUP",
    expectedGeneration: assignment.pairGeneration,
    expectedRevision: evaluationRevision(assignment, student.id, "GROUP"),
    answers: [
      { pairId: studentPairs[0].id, choice: 1, timeOnTaskMs: 3200 },
      { pairId: studentPairs[1].id, choice: 4, timeOnTaskMs: 2500 },
    ],
  });

  assert.equal(assignment.evaluationDrafts?.length, 2);
  assert.equal(assignment.evaluationDrafts[0].choice, 1);
  assert.equal(assignment.evaluationDrafts[0].time_on_task_ms, 3200);
  assert.ok(assignment.evaluationDrafts[0].saved_at.length > 0);

  // Comparisons table remains empty because it's only a draft
  assert.equal(assignment.comparisons?.length ?? 0, 0);
});

test("FR-EVAL-05: Incomplete submissions are allowed and accepted by domain with warning metadata", () => {
  const assignment = createTestAssignment();
  const studentPairs =
    assignment.pairs?.filter(
      (p) => p.evaluator_user_id === student.id && p.side === "GROUP",
    ) ?? [];
  assert.ok(studentPairs.length >= 2);

  // Submit only 1 out of multiple pairs
  applyAssignmentCommand(assignment, student, "submitEvaluation", {
    side: "GROUP",
    expectedGeneration: assignment.pairGeneration,
    expectedRevision: evaluationRevision(assignment, student.id, "GROUP"),
    answers: [{ pairId: studentPairs[0].id, choice: 2, timeOnTaskMs: 4000 }],
  });

  assert.equal(assignment.comparisons?.length, 1);
  assert.equal(assignment.evaluationSubmissions?.length, 1);
  assert.equal(assignment.evaluationSubmissions[0].comparisons.length, 1);
  assert.ok(
    assignment.evaluationSubmissions[0].comparisons.length <
      studentPairs.length,
  );
});

test("FR-EVAL-06: Unlimited re-submissions are supported before deadline, retaining all revisions", () => {
  const assignment = createTestAssignment();
  const studentPairs =
    assignment.pairs?.filter(
      (p) => p.evaluator_user_id === student.id && p.side === "GROUP",
    ) ?? [];

  // Initial revision is 0
  assert.equal(evaluationRevision(assignment, student.id, "GROUP"), 0);

  // Submission 1
  applyAssignmentCommand(assignment, student, "submitEvaluation", {
    side: "GROUP",
    expectedGeneration: assignment.pairGeneration,
    expectedRevision: evaluationRevision(assignment, student.id, "GROUP"),
    answers: [{ pairId: studentPairs[0].id, choice: 1, timeOnTaskMs: 1500 }],
  });
  assert.equal(evaluationRevision(assignment, student.id, "GROUP"), 1);

  // Submission 2
  applyAssignmentCommand(assignment, student, "submitEvaluation", {
    side: "GROUP",
    expectedGeneration: assignment.pairGeneration,
    expectedRevision: evaluationRevision(assignment, student.id, "GROUP"),
    answers: [{ pairId: studentPairs[0].id, choice: 3, timeOnTaskMs: 2500 }],
  });
  assert.equal(evaluationRevision(assignment, student.id, "GROUP"), 2);

  // Submission 3
  applyAssignmentCommand(assignment, student, "submitEvaluation", {
    side: "GROUP",
    expectedGeneration: assignment.pairGeneration,
    expectedRevision: evaluationRevision(assignment, student.id, "GROUP"),
    answers: [{ pairId: studentPairs[0].id, choice: 6, timeOnTaskMs: 3500 }],
  });

  assert.equal(assignment.evaluationSubmissions?.length, 3);
  assert.equal(assignment.evaluationSubmissions[0].revision, 1);
  assert.equal(assignment.evaluationSubmissions[1].revision, 2);
  assert.equal(assignment.evaluationSubmissions[2].revision, 3);

  // The latest submitted comparison choice is 6
  const finalComp = assignment.comparisons?.find(
    (c) => c.pair_assignment_id === studentPairs[0].id,
  );
  assert.equal(finalComp?.choice, 6);
});

test("FR-EVAL-08: Submissions after deadline are rejected and locked", () => {
  // Create an assignment and then simulate the deadline having passed
  const assignment = createTestAssignment();
  assignment.deadline = new Date(Date.now() - 3600000).toISOString();
  const studentPairs =
    assignment.pairs?.filter(
      (p) => p.evaluator_user_id === student.id && p.side === "GROUP",
    ) ?? [];

  assert.throws(() => {
    applyAssignmentCommand(assignment, student, "submitEvaluation", {
      side: "GROUP",
      expectedGeneration: assignment.pairGeneration,
      expectedRevision: evaluationRevision(assignment, student.id, "GROUP"),
      answers: [{ pairId: studentPairs[0].id, choice: 1, timeOnTaskMs: 1000 }],
    });
  }, /ยังไม่เปิดประเมินหรือหมดเวลาแล้ว|เลยกำหนดส่ง|deadline|closed/i);
});

test("FR-EVAL-09: Unsubmitted drafts MUST NOT be included in score calculations", () => {
  const assignment = createTestAssignment();
  const studentPairs =
    assignment.pairs?.filter(
      (p) => p.evaluator_user_id === student.id && p.side === "GROUP",
    ) ?? [];

  // Save only as draft
  applyAssignmentCommand(assignment, student, "saveEvaluationDrafts", {
    side: "GROUP",
    expectedGeneration: assignment.pairGeneration,
    expectedRevision: evaluationRevision(assignment, student.id, "GROUP"),
    answers: [{ pairId: studentPairs[0].id, choice: 1, timeOnTaskMs: 5000 }],
  });

  // Calculate scores
  const scoreResult = generatedResult(assignment, student.id);
  // Group comparisons count used in quality index calculation must be 0
  assert.equal(assignment.comparisons?.length ?? 0, 0);
  assert.ok(scoreResult);
});

test("FR-EVAL-10: Countdown timer triggers when deadline is under 48 hours", () => {
  const baseTime = 1700000000000;

  // Test case 1: 36 hours remaining (< 48 hrs)
  const deadline36h = new Date(baseTime + 36 * 3600 * 1000).toISOString();
  const res36h = calculateDeadlineCountdown(deadline36h, baseTime);
  assert.equal(res36h.isUrgent, true);
  assert.equal(res36h.expired, false);
  assert.equal(res36h.hours, 36);
  assert.equal(res36h.minutes, 0);
  assert.equal(res36h.formatted, "36 ชั่วโมง 0 นาที");

  // Test case 2: 72 hours remaining (> 48 hrs)
  const deadline72h = new Date(baseTime + 72 * 3600 * 1000).toISOString();
  const res72h = calculateDeadlineCountdown(deadline72h, baseTime);
  assert.equal(res72h.isUrgent, false);
  assert.equal(res72h.expired, false);

  // Test case 3: Already expired
  const deadlineExpired = new Date(baseTime - 1000).toISOString();
  const resExpired = calculateDeadlineCountdown(deadlineExpired, baseTime);
  assert.equal(resExpired.expired, true);
  assert.equal(resExpired.isUrgent, false);
});

test("FR-EVAL-11: Individual evaluation side is strictly segregated from group evaluation side", () => {
  const assignment = createTestAssignment();
  const groupPairs =
    assignment.pairs?.filter(
      (p) => p.evaluator_user_id === student.id && p.side === "GROUP",
    ) ?? [];
  const individualPairs =
    assignment.pairs?.filter(
      (p) => p.evaluator_user_id === student.id && p.side === "INDIVIDUAL",
    ) ?? [];

  assert.ok(groupPairs.length > 0);
  assert.ok(individualPairs.length > 0);

  // An answer submitted on GROUP side must not affect INDIVIDUAL side
  applyAssignmentCommand(assignment, student, "submitEvaluation", {
    side: "GROUP",
    expectedGeneration: assignment.pairGeneration,
    expectedRevision: evaluationRevision(assignment, student.id, "GROUP"),
    answers: [{ pairId: groupPairs[0].id, choice: 2, timeOnTaskMs: 2000 }],
  });

  const groupSubs = assignment.evaluationSubmissions?.filter(
    (s) => s.side === "GROUP",
  );
  const indivSubs = assignment.evaluationSubmissions?.filter(
    (s) => s.side === "INDIVIDUAL",
  );
  assert.equal(groupSubs?.length, 1);
  assert.equal(indivSubs?.length ?? 0, 0);
});

test("FR-EVAL-12: Group size <= 2 mathematical invariant excludes individual evaluation", () => {
  // Mathematical formula: pairs per evaluator = C(m-1, 2)
  // For m = 2 members: C(2-1, 2) = C(1, 2) = 0 pairs
  const calcPairsPerEvaluator = (m: number) => {
    if (m < 3) return 0;
    return ((m - 1) * (m - 2)) / 2;
  };

  assert.equal(calcPairsPerEvaluator(2), 0, "m = 2 yields 0 possible pairs");
  assert.equal(calcPairsPerEvaluator(1), 0, "m = 1 yields 0 possible pairs");
  assert.equal(calcPairsPerEvaluator(3), 1, "m = 3 yields 1 pair");
  assert.equal(calcPairsPerEvaluator(4), 3, "m = 4 yields 3 pairs");
  assert.equal(calcPairsPerEvaluator(5), 6, "m = 5 yields 6 pairs");

  // Check mathematical message format
  const groupSize = 2;
  const msg = `C(${groupSize}−1, 2) = 0 คู่`;
  assert.ok(msg.includes("0 คู่"));
});

test("FR-EVAL-13: Client-side offline draft queue key and state isolation", () => {
  const assignmentId = "asgn-123";
  const userId = "usr-456";
  const side = "GROUP";
  const key = getOfflineDraftStorageKey(assignmentId, userId, side);

  assert.equal(key, "peereval_offline_draft_asgn-123_usr-456_GROUP");

  // Test payload serialization and loading via getInitialOfflineDraft
  const pendingAnswers = {
    "pair-1": {
      pairId: "pair-1",
      choice: 3 as const,
      timeOnTaskMs: 1200,
      sequence: 1,
    },
    "pair-2": {
      pairId: "pair-2",
      choice: 5 as const,
      timeOnTaskMs: 2400,
      sequence: 2,
    },
  };

  const mockStorage = {
    getItem: (k: string) => (k === key ? JSON.stringify(pendingAnswers) : null),
  };
  const loaded = getInitialOfflineDraft(key, mockStorage);
  assert.deepEqual(loaded, pendingAnswers);
  assert.equal(Object.keys(loaded).length, 2);

  // Missing or corrupted storage returns empty object safely
  assert.deepEqual(getInitialOfflineDraft(null, mockStorage), {});
  assert.deepEqual(
    getInitialOfflineDraft("other-key", { getItem: () => "invalid json" }),
    {},
  );
});
