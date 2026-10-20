import test from "node:test";
import assert from "node:assert/strict";
import { ClassroomService } from "@/features/classroom/server/classroom-service";
import { FakeClassroomRepository } from "../fakes/fake-classroom-repository";
import { makeUser } from "../factories";

test("ClassroomService: Teacher creates, lists, and retrieves classroom", async () => {
  const teacher = makeUser({ role: "teacher" });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  const created = await service.create(teacher, {
    name: "วิชาพัฒนาซอฟต์แวร์",
    timezone: "Asia/Bangkok",
  });

  assert.equal(created.name, "วิชาพัฒนาซอฟต์แวร์");
  assert.equal(created.created_by, teacher.id);

  const list = await service.list(teacher);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, created.id);

  const fetched = await service.get(teacher, created.id);
  assert.equal(fetched.id, created.id);
});

test("ClassroomService: Outsider cannot access classroom", async () => {
  const teacher = makeUser({ role: "teacher" });
  const outsider = makeUser({ role: "student" });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  const created = await service.create(teacher, { name: "วิชาลับ" });
  await assert.rejects(
    () => service.get(outsider, created.id),
    /คุณไม่มีสิทธิ์เข้าถึงห้องเรียนนี้/,
  );
});

test("ClassroomService: Roster import updates classroom with parsed students", async () => {
  const teacher = makeUser({ role: "teacher" });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  const classroom = await service.create(teacher, { name: "ห้องปฏิบัติการคอมพิวเตอร์" });

  const csv = `email,group_name,display_name
alice@school.ac.th,Team 1,Alice
bob@school.ac.th,Team 1,Bob`;

  const result = await service.importRoster(teacher, classroom.id, csv);
  assert.equal(result.addedCount, 2);
  assert.equal(result.classroom.groups.length, 1);
  assert.equal(result.classroom.members.length, 3); // 1 owner + 2 students
});

test("ClassroomService: Add and remove staff member", async () => {
  const teacher = makeUser({ role: "teacher" });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  const classroom = await service.create(teacher, { name: "ห้องเรียนร่วม" });

  const withStaff = await service.addStaff(teacher, classroom.id, {
    email: "ta@school.ac.th",
    name: "TA Jane",
    role: "TA",
  });
  assert.equal(withStaff.members.length, 2);

  const taMember = withStaff.members.find((m) => m.role === "TA");
  assert.ok(taMember);

  const withoutStaff = await service.removeMember(teacher, classroom.id, taMember.id);
  assert.equal(withoutStaff.members.length, 1);
});

test("ClassroomService: Archive classroom", async () => {
  const teacher = makeUser({ role: "teacher" });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  const classroom = await service.create(teacher, { name: "ภาคเรียนที่แล้ว" });
  const archived = await service.archive(teacher, classroom.id);
  assert.equal(archived.status, "ARCHIVED");
});

test("ClassroomService: Student joins classroom using slug / code", async () => {
  const teacher = makeUser({ role: "teacher" });
  const student = makeUser({ role: "student", email: "student@school.ac.th" });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  const classroom = await service.create(teacher, {
    name: "วิชาฟิสิกส์พื้นฐาน",
    slug: "physics-101",
  });

  const joined = await service.join(student, "physics-101");
  assert.equal(joined.id, classroom.id);
  assert.equal(joined.members.length, 2);

  const member = joined.members.find((m) => m.user_id === student.id);
  assert.ok(member);
  assert.equal(member.role, "STUDENT");

  // Idempotent join
  const reJoined = await service.join(student, "physics-101");
  assert.equal(reJoined.members.length, 2);

  // Unknown code throws 404
  await assert.rejects(
    () => service.join(student, "non-existent-code"),
    /ไม่พบห้องเรียน/,
  );
});

test("ClassroomService: Teacher links assignment to classroom", async () => {
  const teacher = makeUser({ role: "teacher" });
  const outsider = makeUser({ role: "student" });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  const classroom = await service.create(teacher, { name: "วิชาคณิตศาสตร์" });
  const assignmentId = crypto.randomUUID();

  const linked = await service.linkAssignment(teacher, classroom.id, assignmentId);
  assert.equal(linked.assignment_ids?.length, 1);
  assert.equal(linked.assignment_ids?.[0], assignmentId);

  // Idempotent link
  const reLinked = await service.linkAssignment(teacher, classroom.id, assignmentId);
  assert.equal(reLinked.assignment_ids?.length, 1);

  // Outsider cannot link assignment
  await assert.rejects(
    () => service.linkAssignment(outsider, classroom.id, assignmentId),
    /เฉพาะผู้สอนเท่านั้น/,
  );
});
