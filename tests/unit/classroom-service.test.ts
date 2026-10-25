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

test("FR-AUTHZ-02: ClassroomService: Outsider receives 404 on cross-classroom access", async () => {
  const teacher = makeUser({ role: "teacher" });
  const outsider = makeUser({ role: "student" });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  const created = await service.create(teacher, { name: "วิชาลับ" });
  await assert.rejects(
    () => service.get(outsider, created.id),
    /ไม่พบห้องเรียน/,
  );
});

test("FR-AUTHZ-03: TA can import classroom roster successfully", async () => {
  const teacher = makeUser({ role: "teacher" });
  const taUser = makeUser({
    role: "student",
    name: "TA Bob",
    email: "tabob@uni.ac.th",
  });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  const classroom = await service.create(teacher, { name: "Lab CS" });
  await service.addStaff(teacher, classroom.id, {
    email: taUser.email,
    name: taUser.name,
    role: "TA",
  });

  const csv = `email,group_name,display_name\ns1@uni.ac.th,Alpha,Student 1`;
  const result = await service.importRoster(taUser, classroom.id, csv);
  assert.equal(
    result.classroom.members.some((m) => m.email === "s1@uni.ac.th"),
    true,
  );
});

test("ClassroomService: Roster import updates classroom with parsed students", async () => {
  const teacher = makeUser({ role: "teacher" });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  const classroom = await service.create(teacher, {
    name: "ห้องปฏิบัติการคอมพิวเตอร์",
  });

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

  const withoutStaff = await service.removeMember(
    teacher,
    classroom.id,
    taMember.id,
  );
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

  const linked = await service.linkAssignment(
    teacher,
    classroom.id,
    assignmentId,
  );
  assert.equal(linked.assignment_ids?.length, 1);
  assert.equal(linked.assignment_ids?.[0], assignmentId);

  // Idempotent link
  const reLinked = await service.linkAssignment(
    teacher,
    classroom.id,
    assignmentId,
  );
  assert.equal(reLinked.assignment_ids?.length, 1);

  // Outsider cannot link assignment
  await assert.rejects(
    () => service.linkAssignment(outsider, classroom.id, assignmentId),
    /เฉพาะผู้สอนเท่านั้น/,
  );
});

test("ClassroomService: Allowed email domains support @prefix and subdomains (e.g. @kmitl.ac.th)", async () => {
  const teacher = makeUser({ role: "teacher" });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  // Teacher sets allowed domains as "@kmitl.ac.th"
  const classroom = await service.create(teacher, {
    name: "วิศวกรรมคอมพิวเตอร์",
    slug: "cpe-2026",
    allowed_email_domains: ["@kmitl.ac.th"],
  });

  // Student 1: Main domain @kmitl.ac.th
  const student1 = makeUser({
    role: "student",
    email: "65010001@kmitl.ac.th",
    name: "Somchai Kmitl",
  });
  const joined1 = await service.join(student1, "CPE-2026"); // Case-insensitive slug
  assert.equal(joined1.id, classroom.id);
  assert.ok(
    joined1.members.some(
      (m) => m.email === student1.email && m.role === "STUDENT",
    ),
  );

  // Student 2: Subdomain @student.kmitl.ac.th
  const student2 = makeUser({
    role: "student",
    email: "65010002@student.kmitl.ac.th",
    name: "Somsri Student",
  });
  const joined2 = await service.join(student2, "cpe-2026");
  assert.ok(joined2.members.some((m) => m.email === student2.email));

  // Student 3: Subdomain @it.kmitl.ac.th
  const student3 = makeUser({
    role: "student",
    email: "65010003@it.kmitl.ac.th",
    name: "Somkiat IT",
  });
  const joined3 = await service.join(student3, "cpe-2026");
  assert.ok(joined3.members.some((m) => m.email === student3.email));

  // Student 4: Non-matching domain (gmail.com) -> Rejected with 403
  const outsider = makeUser({
    role: "student",
    email: "outsider@gmail.com",
    name: "Gmail User",
  });
  await assert.rejects(
    () => service.join(outsider, "cpe-2026"),
    /อีเมลของคุณไม่อยู่ในโดเมนที่ได้รับอนุญาตสำหรับห้องเรียนนี้/,
  );
});

test("ClassroomService: Joining classroom activates PENDING member from CSV roster (FR-CLASS-04)", async () => {
  const teacher = makeUser({ role: "teacher" });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  const classroom = await service.create(teacher, {
    name: "วิชาระบบฐานข้อมูล",
    slug: "db-101",
  });

  // Import CSV with pending student
  const csv = `email,group_name,display_name
somchai@kmitl.ac.th,Team Alpha,Somchai`;
  await service.importRoster(teacher, classroom.id, csv);

  // Student logs in with Google and joins
  const student = makeUser({
    id: "google-uid-12345",
    role: "student",
    email: "somchai@kmitl.ac.th",
    name: "Somchai (Google)",
  });

  const joined = await service.join(student, "DB-101");
  const member = joined.members.find((m) => m.email === "somchai@kmitl.ac.th");
  assert.ok(member);
  assert.equal(member.user_id, student.id); // Binds real google user_id
  assert.equal(member.status, "ACTIVE"); // Activates from PENDING
});

test("FR-AUTH-02: Roster import rejects emails outside classroom allowed_email_domains", async () => {
  const teacher = makeUser({ role: "teacher" });
  const repo = new FakeClassroomRepository();
  const service = new ClassroomService(repo);

  const classroom = await service.create(teacher, {
    name: "Engineering Lab",
    allowed_email_domains: ["@kmitl.ac.th"],
  });

  const csv = `email,group_name,display_name\nstudent1@other.ac.th,Alpha,Student 1`;
  await assert.rejects(
    () => service.importRoster(teacher, classroom.id, csv),
    /ไม่อยู่ในโดเมนที่อนุญาตสำหรับห้องเรียนนี้/,
  );
});
