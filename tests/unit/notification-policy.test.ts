import test from "node:test";
import assert from "node:assert/strict";
import {
  assignmentEvent,
  deadlineReminder,
} from "@/features/notifications/domain/notification-policy";
import { makeVotingFixture } from "../factories";
import { visibleAssignment } from "@/features/assignments/domain/assignment-visibility";

test("notification events identify committed lifecycle transitions and versions without score data", () => {
  const { assignment } = makeVotingFixture();
  const opened = assignmentEvent("draft", assignment, 4);
  assert.equal(opened?.kind, "assignment_opened");
  assert.equal(opened?.key, `${assignment.id}:assignment_opened:5`);
  assert.deepEqual(Object.keys(opened!).sort(), ["key", "kind"]);
  assert.equal(assignmentEvent("active", assignment, 5), undefined);
  assignment.status = "finalized";
  assert.equal(
    assignmentEvent("closed", assignment, 8)?.kind,
    "results_finalized",
  );
  assert.equal(assignmentEvent("finalized", assignment, 9), undefined);
});

test("deadline reminders include the 48-hour boundary and exclude expired, distant and inactive work", () => {
  const { assignment, student } = makeVotingFixture();
  const now = Date.parse(assignment.deadline) - 48 * 3600000;
  assert.equal(
    deadlineReminder(assignment, student.id, now)?.kind,
    "deadline_reminder",
  );
  assert.equal(deadlineReminder(assignment, student.id, now - 1), undefined);
  assert.equal(
    deadlineReminder(assignment, student.id, Date.parse(assignment.deadline)),
    undefined,
  );
  for (const status of ["draft", "closed", "finalized"] as const) {
    assert.equal(
      deadlineReminder({ ...assignment, status }, student.id, now),
      undefined,
    );
  }
});

test("reminders exclude completed students, outsiders and work without eligible targets", () => {
  const { assignment, student } = makeVotingFixture();
  assert.equal(deadlineReminder(assignment, "outsider"), undefined);
  const target = assignment.groups[1];
  const initial = deadlineReminder(assignment, student.id);
  assert.ok(initial);
  assignment.votes.push({
    userId: student.id,
    groupId: target.id,
    scores: [4, 4],
    createdAt: new Date().toISOString(),
  });
  assert.equal(deadlineReminder(assignment, student.id), undefined);
  assert.ok(!JSON.stringify(initial).includes(student.name));
  assignment.votes = [];
  assignment.groups[1].members = [];
  assert.equal(deadlineReminder(assignment, student.id), undefined);
});

test("individual reminders use only unfinished eligible peer targets", () => {
  const { assignment, student, other } = makeVotingFixture();
  assignment.evaluationMode = "individual";
  assignment.groups[0].members.push({ id: other.id, name: other.name });
  assignment.groups.pop();
  assert.ok(deadlineReminder(assignment, student.id));
  assignment.votes.push({
    userId: student.id,
    studentId: other.id,
    scores: [4, 4],
    createdAt: new Date().toISOString(),
  });
  assert.equal(deadlineReminder(assignment, student.id), undefined);
});

test("finalized notification destinations do not expose raw ballot snapshots to students", () => {
  const { assignment, teacher, student, other } = makeVotingFixture();
  assignment.status = "finalized";
  assignment.votes = [
    {
      userId: other.id,
      groupId: assignment.groups[0].id,
      scores: [4, 4],
      createdAt: new Date().toISOString(),
    },
  ];
  assignment.finalizedSnapshot = {
    finalizedAt: new Date().toISOString(),
    finalizedBy: teacher.id,
    inputs: {
      votes: assignment.votes,
      groups: assignment.groups,
      questions: assignment.questions,
    },
    outputs: {},
  };
  assert.equal(
    visibleAssignment(assignment, teacher.id).finalizedSnapshot,
    assignment.finalizedSnapshot,
  );
  const visible = visibleAssignment(assignment, student.id);
  assert.equal(visible.finalizedSnapshot, undefined);
  assert.equal(visible.votes[0].userId, "anonymous");
  assert.equal(assignment.votes[0].userId, other.id);
});
