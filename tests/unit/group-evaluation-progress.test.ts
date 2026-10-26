import test from "node:test";
import assert from "node:assert/strict";
import { makeAssignment, makeUser } from "../factories";
import { saveEvaluation } from "@/features/pairwise/domain/evaluation-submission";
import { visibleAssignment } from "@/features/assignments/domain/assignment-visibility";
import { groupEvaluationProgress } from "@/features/assignments/domain/group-evaluation-progress";

function fixture() {
  const student = makeUser({ id: "s1", role: "student", name: "Student One" });
  const group = {
    id: "g1",
    name: "Group One",
    members: [
      student,
      { id: "s2", name: "Student Two" },
      { id: "s3", name: "Student Three" },
    ],
  };
  const assignment = makeAssignment({
    status: "active",
    pairwiseRequired: true,
    pairGeneration: 1,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    questions: ["Quality"],
    groups: [
      group,
      { id: "g2", name: "Group Two", members: [] },
      { id: "g3", name: "Group Three", members: [] },
    ],
  });
  assignment.pairs = [
    {
      id: "group-pair",
      assignment_id: assignment.id,
      criterion_id: "GROUP-0",
      side: "GROUP",
      item_a_id: "g2",
      item_b_id: "g3",
      evaluator_user_id: student.id,
      display_left_item_id: "g3",
      generation: 1,
      source: "AUTO",
      created_at: assignment.createdAt,
    },
    {
      id: "individual-pair",
      assignment_id: assignment.id,
      criterion_id: "INDIVIDUAL-0",
      side: "INDIVIDUAL",
      item_a_id: "s2",
      item_b_id: "s3",
      evaluator_user_id: student.id,
      display_left_item_id: "s2",
      generation: 1,
      source: "AUTO",
      created_at: assignment.createdAt,
    },
  ];
  const input = (side: "GROUP" | "INDIVIDUAL") => ({
    expectedGeneration: 1,
    expectedRevision: 0,
    side,
    answers: assignment
      .pairs!.filter((pair) => pair.side === side)
      .map((pair) => ({ pairId: pair.id, choice: 6 })),
  });
  return { assignment, student, group, input };
}

test("teacher group view recognizes submitted pairwise answers without legacy votes, for both evaluation sides", () => {
  const { assignment, student, group, input } = fixture();
  saveEvaluation(assignment, student, input("GROUP"), true);
  saveEvaluation(assignment, student, input("INDIVIDUAL"), true);
  assert.equal(assignment.votes.length, 0);
  const progress = groupEvaluationProgress(
    visibleAssignment(assignment, assignment.ownerId),
    group,
  );
  assert.equal(progress[0].submitted, 2);
  assert.equal(progress[0].tasks.length, 2);
  assert.equal(progress[0].tasks[0].leftName, "Group Three");
  assert.equal(progress[0].tasks[0].rightName, "Group Two");
  assert.equal(progress[0].tasks[0].criterionName, "Quality");
  assert.equal(progress[0].tasks[1].rightName, "Student Three");
  assert.equal(progress[0].tasks[0].response?.choice, 6);
  assert.ok(progress[0].tasks[0].response?.submitted_at);
  assert.equal(progress[1].tasks.length, 0);
});

test("draft saves and removed pair history do not mark current tasks as submitted", () => {
  const { assignment, student, group, input } = fixture();
  saveEvaluation(assignment, student, input("GROUP"), false);
  const draft = assignment.evaluationDrafts![0];
  assignment.comparisons = [
    draft,
    { ...draft, pair_assignment_id: "removed-pair", status: "SUBMITTED" },
  ];
  const progress = groupEvaluationProgress(assignment, group)[0];
  assert.equal(progress.submitted, 0);
  assert.equal(progress.tasks.length, 2);
  assert.equal(progress.tasks[0].response, undefined);
});

test("excluded submissions retain sent status; added tasks remain pending and evaluator mismatch is rejected", () => {
  const { assignment, student, group, input } = fixture();
  saveEvaluation(assignment, student, input("GROUP"), true);
  assignment.comparisons![0].status = "EXCLUDED";
  assignment.pairs!.push({
    ...assignment.pairs![0],
    id: "additional-pair",
    source: "INSTRUCTOR_EXTRA",
  });
  assignment.comparisons!.push({
    ...assignment.comparisons![0],
    pair_assignment_id: "individual-pair",
    evaluator_user_id: "someone-else",
  });
  const progress = groupEvaluationProgress(assignment, group)[0];
  assert.equal(progress.submitted, 1);
  assert.equal(progress.tasks.length, 3);
  assert.equal(progress.tasks[0].response?.status, "EXCLUDED");
  assert.equal(progress.tasks[1].response, undefined);
  assert.equal(progress.tasks[2].response, undefined);
});

test("finalized group progress reads frozen inputs, including pair names and submitted answers", () => {
  const { assignment, student, group, input } = fixture();
  saveEvaluation(assignment, student, input("GROUP"), true);
  assignment.finalizedSnapshot = {
    finalizedAt: new Date().toISOString(),
    finalizedBy: assignment.ownerId,
    inputs: structuredClone({
      pairs: assignment.pairs,
      comparisons: assignment.comparisons,
      groups: assignment.groups,
      questions: assignment.questions,
      votes: assignment.votes,
    }),
    outputs: {},
  };
  assignment.status = "finalized";
  assignment.pairs = [];
  assignment.comparisons = [];
  assignment.questions = [];
  const progress = groupEvaluationProgress(assignment, group)[0];
  assert.equal(progress.submitted, 1);
  assert.equal(progress.tasks.length, 2);
  assert.equal(progress.tasks[0].leftName, "Group Three");
  assert.equal(progress.tasks[0].criterionName, "Quality");
});
