import test from "node:test";
import assert from "node:assert/strict";
import { applyAssignmentCommand } from "../src/features/assignments/domain/assignment-policy.ts";
import { average } from "../src/features/assignments/domain/scoring.ts";

const teacher = { id: "t", name: "Teacher", role: "teacher" };
const student = { id: "s1", name: "Student", role: "student" };
function assignment() {
  return {
    id: "a",
    ownerId: "t",
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: "draft",
    questions: ["Content", "Delivery"],
    students: [
      { id: "s1", name: "Student" },
      { id: "s2", name: "Other" },
    ],
    groups: [
      { id: "g1", name: "One", members: [{ id: "s1", name: "Student" }] },
      { id: "g2", name: "Two", members: [{ id: "s2", name: "Other" }] },
    ],
    votes: [],
  };
}
test("owner can start and stop voting", () => {
  const a = assignment();
  applyAssignmentCommand(a, teacher, "start", {});
  assert.equal(a.status, "active");
  applyAssignmentCommand(a, teacher, "stop", {});
  assert.equal(a.status, "closed");
});
test("student cannot start voting", () =>
  assert.throws(() =>
    applyAssignmentCommand(assignment(), student, "start", {}),
  ));
test("another teacher cannot manage this assignment", () =>
  assert.throws(() =>
    applyAssignmentCommand(
      assignment(),
      { ...teacher, id: "other" },
      "questions",
      {
        questions: ["X"],
      },
    ),
  ));
test("voting needs two populated groups", () => {
  const a = assignment();
  a.groups[1].members = [];
  assert.throws(() => applyAssignmentCommand(a, teacher, "start", {}));
});
test("voting needs questions", () => {
  const a = assignment();
  a.questions = [];
  assert.throws(() => applyAssignmentCommand(a, teacher, "start", {}));
});
test("valid vote is recorded and contributes to average", () => {
  const a = assignment();
  a.status = "active";
  applyAssignmentCommand(a, student, "vote", { groupId: "g2", scores: [5, 3] });
  assert.equal(a.votes.length, 1);
  assert.equal(average(a, "g2"), 4);
  assert.equal(average(a, "g1"), 0);
});
test("self voting is rejected", () => {
  const a = assignment();
  a.status = "active";
  assert.throws(() =>
    applyAssignmentCommand(a, student, "vote", {
      groupId: "g1",
      scores: [5, 5],
    }),
  );
});
test("duplicate vote is rejected", () => {
  const a = assignment();
  a.status = "active";
  applyAssignmentCommand(a, student, "vote", { groupId: "g2", scores: [5, 4] });
  assert.throws(() =>
    applyAssignmentCommand(a, student, "vote", {
      groupId: "g2",
      scores: [2, 2],
    }),
  );
});
test("votes after deadline are rejected", () => {
  const a = assignment();
  a.status = "active";
  a.deadline = new Date(Date.now() - 1).toISOString();
  assert.throws(() =>
    applyAssignmentCommand(a, student, "vote", {
      groupId: "g2",
      scores: [5, 4],
    }),
  );
});
test("closed assignment rejects votes", () => {
  const a = assignment();
  a.status = "closed";
  assert.throws(() =>
    applyAssignmentCommand(a, student, "vote", {
      groupId: "g2",
      scores: [5, 4],
    }),
  );
});
test("outsider cannot vote", () => {
  const a = assignment();
  a.status = "active";
  assert.throws(() =>
    applyAssignmentCommand(a, { ...student, id: "outsider" }, "vote", {
      groupId: "g2",
      scores: [5, 4],
    }),
  );
});
test("all answers must be integers from 1 to 6 (6-point forced choice)", () => {
  for (const scores of [[7, 5], [0, 5], [1.5, 3], ["5", 3], [5], []]) {
    const a = assignment();
    a.status = "active";
    assert.throws(() =>
      applyAssignmentCommand(a, student, "vote", { groupId: "g2", scores }),
    );
  }
});
test("student can only join one group", () =>
  assert.throws(() =>
    applyAssignmentCommand(assignment(), student, "joinGroup", {
      groupId: "g2",
    }),
  ));
test("new student can join and create a group", () => {
  const a = assignment();
  const newcomer = { ...student, id: "new" };
  applyAssignmentCommand(a, newcomer, "group", { name: "Three" });
  assert.equal(a.students.length, 3);
  assert.equal(a.groups[2].members[0].id, "new");
});
test("group and question changes lock after voting starts", () => {
  const a = assignment();
  a.status = "active";
  assert.throws(() =>
    applyAssignmentCommand(a, teacher, "group", { name: "Three" }),
  );
  assert.throws(() =>
    applyAssignmentCommand(a, teacher, "questions", { questions: ["Changed"] }),
  );
});
test("empty question and oversized import are rejected", () => {
  assert.throws(() =>
    applyAssignmentCommand(assignment(), teacher, "questions", {
      questions: [""],
    }),
  );
  assert.throws(() =>
    applyAssignmentCommand(assignment(), teacher, "questions", {
      questions: Array(101).fill("Q"),
    }),
  );
});
