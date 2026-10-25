import test from "node:test";
import assert from "node:assert/strict";
import { makeUser, makeAssignment } from "../factories";
import {
  createClassroom,
  applyRosterImport,
} from "@/features/classroom/domain/classroom";
import { parseRosterCsv } from "@/features/classroom/domain/roster-parser";
import { AssignmentService } from "@/features/assignments/server/assignment-service";
import { ClassroomService } from "@/features/classroom/server/classroom-service";
import { FakeAssignmentRepository } from "../fakes/fake-assignment-repository";
import { FakeClassroomRepository } from "../fakes/fake-classroom-repository";

test("assignment creation checks classroom ownership and drafts project the latest roster", async () => {
  const teacher = makeUser({ role: "teacher" });
  const other = makeUser({ role: "teacher" });
  const classroom = applyRosterImport(
    createClassroom({ name: "KMITL" }, teacher),
    parseRosterCsv("email,group_name\ns1@kmitl.ac.th,Group 1"),
  ).classroom;
  const classrooms = new FakeClassroomRepository([classroom]);
  const assignments = new FakeAssignmentRepository([], classrooms);
  const service = new AssignmentService(assignments, classrooms);
  const input = {
    action: "create",
    title: "CSV work",
    classroomId: classroom.id,
    deadline: new Date(Date.now() + 86400000).toISOString(),
  };
  await assert.rejects(() => service.execute(other, input), /เฉพาะเจ้าของ/);
  const a = await service.execute(teacher, input);
  assert.equal(a.students.length, 1);
  assert.equal(a.groups[0].members.length, 1);
  await assert.rejects(
    () =>
      service.execute(teacher, { action: "group", id: a.id, name: "Manual" }),
    /CSV/,
  );
  const changed = applyRosterImport(
    classroom,
    parseRosterCsv("email,group_name\ns2@kmitl.ac.th,Group 1"),
  ).classroom;
  assert.equal(await classrooms.update(changed, 0), true);
  assert.equal((await service.get(teacher, a.id)).students.length, 2);
  assert.equal((await service.list(teacher))[0].students.length, 2);
  const linked = makeAssignment({ ownerId: teacher.id });
  await assignments.create(linked);
  const record = (await classrooms.findById(classroom.id))!;
  record.classroom.assignment_ids = [linked.id];
  assert.equal(await classrooms.update(record.classroom, record.version), true);
  assert.equal(
    (await service.get(teacher, linked.id)).classroomRosterManaged,
    true,
  );
});

test("authenticated classroom listing activates only the matching pending student and retains group", async () => {
  const teacher = makeUser({ role: "teacher" });
  const classroom = applyRosterImport(
    createClassroom({ name: "KMITL" }, teacher),
    parseRosterCsv(
      "email,group_name\ns1@kmitl.ac.th,Group 1\ns2@kmitl.ac.th,Group 1",
    ),
  ).classroom;
  const member = classroom.members.find((m) => m.email === "s1@kmitl.ac.th")!;
  const user = makeUser({
    id: member.user_id,
    email: member.email,
    role: "student",
  });
  const repo = new FakeClassroomRepository([classroom]);
  const service = new ClassroomService(repo);
  const [active] = await service.list(user);
  assert.equal(
    active.members.find((m) => m.user_id === user.id)!.status,
    "ACTIVE",
  );
  assert.equal(
    active.members.find((m) => m.user_id === user.id)!.group_id,
    member.group_id,
  );
  assert.equal(
    active.members.find((m) => m.email === "s2@kmitl.ac.th")!.status,
    "PENDING",
  );
  assert.throws(
    () =>
      applyRosterImport(
        classroom,
        parseRosterCsv(`email,group_name\n${teacher.email},Group 1`),
      ),
    /ไม่สามารถเปลี่ยนผู้สอน/,
  );
});
