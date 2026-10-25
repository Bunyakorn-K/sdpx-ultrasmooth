import test from "node:test";
import assert from "node:assert/strict";
import { AssignmentService } from "@/features/assignments/server/assignment-service";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import { createAssignment } from "@/features/assignments/domain/create-assignment";
import { FakeAssignmentRepository } from "../fakes/fake-assignment-repository";
import { FakeClassroomRepository } from "../fakes/fake-classroom-repository";
import { makeAssignment, makeUser, makeVotingFixture } from "../factories";

test("US02: teacher creates an assignment identified only by its resource ID", async () => {
  const teacher = makeUser({ role: "teacher" });
  const repository = new FakeAssignmentRepository();
  const service = new AssignmentService(repository);
  const created = await service.execute(teacher, {
    action: "create",
    title: "Review",
    deadline: new Date(Date.now() + 86400000).toISOString(),
    questions: ["Content"],
  });
  assert.equal(created.ownerId, teacher.id);
  assert.match(created.id, /^[0-9a-f-]{36}$/);
  assert.equal(Object.hasOwn(created, "code"), false);
  assert.equal((await repository.listForUser(teacher.id)).length, 1);
});
test("US02: students cannot create assignments", () =>
  assert.throws(() =>
    createAssignment(
      { title: "X", deadline: new Date(Date.now() + 86400000).toISOString() },
      makeUser(),
    ),
  ));
test("US02: past deadlines and missing titles are rejected", () => {
  const teacher = makeUser({ role: "teacher" });
  for (const input of [
    { title: "", deadline: "invalid" },
    { title: "X", deadline: new Date(Date.now() - 1).toISOString() },
  ])
    assert.throws(() => createAssignment(input, teacher));
});
test("US03: outsider cannot read another assignment", async () => {
  const assignment = makeAssignment();
  const service = new AssignmentService(
    new FakeAssignmentRepository([assignment]),
  );
  await assert.rejects(() => service.get(makeUser(), assignment.id), /ไม่มีสิทธิ์/);
});
test("US03: joined student can read assignment while missing IDs return 404", async () => {
  const { student, assignment } = makeVotingFixture();
  const service = new AssignmentService(
    new FakeAssignmentRepository([assignment]),
  );
  assert.equal((await service.get(student, assignment.id)).id, assignment.id);
  await assert.rejects(() => service.get(student, crypto.randomUUID()), /ไม่พบ/);
});
test("US03: student in classroom can list and read assignment without prior join", async () => {
  const teacher = makeUser({ role: "teacher" });
  const student = makeUser({ role: "student" });
  const outsider = makeUser({ role: "student" });
  const classroomId = crypto.randomUUID();
  const classroomRepo = new FakeClassroomRepository([
    {
      id: classroomId,
      name: "Computer Science",
      slug: "cs-101",
      timezone: "Asia/Bangkok",
      allowed_email_domains: [],
      status: "ACTIVE",
      created_by: teacher.id,
      created_at: new Date().toISOString(),
      members: [
        {
          id: crypto.randomUUID(),
          classroom_id: classroomId,
          user_id: student.id,
          role: "STUDENT",
          joined_at: new Date().toISOString(),
          display_name: student.name,
          email: student.email,
          status: "ACTIVE",
        },
      ],
      groups: [],
      assignment_ids: [],
    },
  ]);
  const assignment = makeAssignment({
    ownerId: teacher.id,
    classroomId,
    students: [],
  });
  const assignmentRepo = new FakeAssignmentRepository(
    [assignment],
    classroomRepo,
  );
  const service = new AssignmentService(assignmentRepo, classroomRepo);

  const studentList = await service.list(student);
  assert.equal(studentList.length, 1);
  assert.equal(studentList[0].id, assignment.id);

  const fetched = await service.get(student, assignment.id);
  assert.equal(fetched.id, assignment.id);

  await assert.rejects(() => service.get(outsider, assignment.id), /ไม่มีสิทธิ์/);
});
test("US04: student can join a teacher-created group only once", () => {
  const teacher = makeUser({ role: "teacher" });
  const student = makeUser();
  const assignment = makeAssignment({ ownerId: teacher.id });
  applyAssignmentCommand(assignment, teacher, "group", { name: "Team" });
  applyAssignmentCommand(assignment, student, "joinGroup", {
    groupId: assignment.groups[0].id,
  });
  assert.equal(assignment.students.length, 1);
  assert.equal(assignment.groups[0].members[0].id, student.id);
  assert.throws(() =>
    applyAssignmentCommand(assignment, student, "group", { name: "Second" }),
  );
});
test("US04: unknown group and empty or oversized group names are rejected", () => {
  const student = makeUser();
  const assignment = makeAssignment({ students: [student] });
  assert.throws(() =>
    applyAssignmentCommand(assignment, student, "joinGroup", {
      groupId: "missing",
    }),
  );
  for (const name of ["", "x".repeat(101)])
    assert.throws(() =>
      applyAssignmentCommand(assignment, student, "group", { name }),
    );
});
test("US04: student can create a new group directly and becomes a member", () => {
  const teacher = makeUser({ role: "teacher" });
  const student = makeUser({ role: "student" });
  const assignment = makeAssignment({ ownerId: teacher.id });
  applyAssignmentCommand(assignment, student, "group", {
    name: "Student Group",
  });
  assert.equal(assignment.groups.length, 1);
  assert.equal(assignment.groups[0].name, "Student Group");
  assert.equal(assignment.groups[0].members[0].id, student.id);
  assert.equal(
    assignment.students.some((s) => s.id === student.id),
    true,
  );
});
test("US05: owner can update questions before voting, including clearing drafts", () => {
  const teacher = makeUser({ role: "teacher" });
  const assignment = makeAssignment({ ownerId: teacher.id });
  applyAssignmentCommand(assignment, teacher, "questions", {
    questions: [" New question "],
  });
  assert.deepEqual(assignment.questions, ["New question"]);
  applyAssignmentCommand(assignment, teacher, "questions", { questions: [] });
  assert.equal(assignment.questions.length, 0);
});
test("US06: owner cannot stop a draft or start an expired assignment", () => {
  const teacher = makeUser({ role: "teacher" });
  const assignment = makeAssignment({ ownerId: teacher.id });
  assert.throws(() => applyAssignmentCommand(assignment, teacher, "stop", {}));
  assignment.deadline = new Date(Date.now() - 1).toISOString();
  assert.throws(() => applyAssignmentCommand(assignment, teacher, "start", {}));
});
test("US07: unknown commands and voting on empty groups are rejected", () => {
  const { student, assignment } = makeVotingFixture();
  assert.throws(() =>
    applyAssignmentCommand(assignment, student, "toString", {}),
  );
  assignment.groups[1].members = [];
  assert.throws(() =>
    applyAssignmentCommand(assignment, student, "vote", {
      groupId: assignment.groups[1].id,
      scores: [5, 5],
    }),
  );
});
test("US03: retired assignment enrollment is rejected in every lifecycle state", () => {
  for (const status of ["draft", "active", "closed", "finalized"] as const) {
    const assignment = makeAssignment({ status });
    assert.throws(() =>
      applyAssignmentCommand(assignment, makeUser(), "join", {}),
    );
  }
});
test("US01: service lists visible assignments for user", async () => {
  const teacher = makeUser({ role: "teacher" });
  const student = makeUser({ role: "student" });
  const assignment = makeAssignment({
    ownerId: teacher.id,
    students: [{ id: student.id, name: student.name }],
  });
  const service = new AssignmentService(
    new FakeAssignmentRepository([assignment]),
  );
  const teacherList = await service.list(teacher);
  assert.equal(teacherList.length, 1);
  assert.equal(teacherList[0].id, assignment.id);

  const studentList = await service.list(student);
  assert.equal(studentList.length, 1);
  assert.equal(studentList[0].id, assignment.id);

  const outsiderList = await service.list(makeUser());
  assert.equal(outsiderList.length, 0);
});
test("US03: removed enrollment command cannot add students to an assignment", async () => {
  const assignment = makeAssignment({ status: "draft" });
  const student = makeUser({ role: "student" });
  const repo = new FakeAssignmentRepository([assignment]);
  const service = new AssignmentService(repo);
  await assert.rejects(
    () => service.execute(student, { action: "join", id: assignment.id }),
    { status: 403 },
  );
  assert.deepEqual(
    (await repo.findById(assignment.id))!.assignment.students,
    [],
  );
});

test("US02: new assignments have independent IDs without generating enrollment codes", async () => {
  const teacher = makeUser({ role: "teacher" });
  const repo = new FakeAssignmentRepository();
  const service = new AssignmentService(repo);
  const input = {
    action: "create",
    title: "Independent Assignment",
    deadline: new Date(Date.now() + 86400000).toISOString(),
  };
  const first = await service.execute(teacher, input);
  const second = await service.execute(teacher, input);
  assert.notEqual(first.id, second.id);
  assert.equal(Object.hasOwn(first, "code"), false);
  assert.equal(Object.hasOwn(second, "code"), false);
  assert.equal((await repo.listForUser(teacher.id)).length, 2);
});
