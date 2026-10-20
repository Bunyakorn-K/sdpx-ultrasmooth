import test from "node:test";
import assert from "node:assert/strict";
import { makeUser } from "../factories";
import {
  createClassroom,
  applyRosterImport,
  addStaffMember,
  removeMember,
  archiveClassroom,
} from "@/features/classroom/domain/classroom";
import { parseRosterCsv } from "@/features/classroom/domain/roster-parser";

test("FR-CLASS-01: Teacher creates a new classroom with slug and owner membership", () => {
  const teacher = makeUser({ role: "teacher", name: "ดร. สมชาย" });
  const classroom = createClassroom(
    { name: "วิศวกรรมซอฟต์แวร์ ภาค 1/2569", timezone: "Asia/Bangkok" },
    teacher,
  );

  assert.equal(classroom.name, "วิศวกรรมซอฟต์แวร์ ภาค 1/2569");
  assert.equal(classroom.status, "ACTIVE");
  assert.equal(classroom.timezone, "Asia/Bangkok");
  assert.equal(classroom.created_by, teacher.id);
  assert.equal(classroom.members.length, 1);
  assert.equal(classroom.members[0].role, "OWNER");
  assert.equal(classroom.members[0].user_id, teacher.id);
  assert.equal(classroom.members[0].status, "ACTIVE");
});

test("FR-CLASS-01: Non-teacher cannot create a classroom", () => {
  const student = makeUser({ role: "student" });
  assert.throws(
    () => createClassroom({ name: "กลุ่มเรียน" }, student),
    /เฉพาะอาจารย์เท่านั้น/,
  );
});

test("FR-CLASS-02 & 03: Roster CSV import populates groups and pending students", () => {
  const teacher = makeUser({ role: "teacher" });
  const classroom = createClassroom({ name: "CPE201" }, teacher);

  const csv = `email,group_name,student_id,display_name
s1@univ.ac.th,Alpha,6601001,Somchai
s2@univ.ac.th,Alpha,6601002,Somsri
s3@univ.ac.th,Beta,6601003,Somkiat
s4@univ.ac.th,Beta,6601004,Somporn`;

  const parsed = parseRosterCsv(csv);
  const { classroom: updated, addedCount, updatedCount } = applyRosterImport(
    classroom,
    parsed,
  );

  assert.equal(addedCount, 4);
  assert.equal(updatedCount, 0);
  assert.equal(updated.groups.length, 2);
  assert.equal(updated.members.length, 5); // 1 owner + 4 students

  const somchai = updated.members.find((m) => m.email === "s1@univ.ac.th");
  assert.ok(somchai);
  assert.equal(somchai.status, "PENDING"); // FR-CLASS-04
  assert.equal(somchai.role, "STUDENT");
  assert.equal(somchai.student_id, "6601001");
});

test("FR-CLASS-05: Upsert CSV updates group assignment without deleting existing records", () => {
  const teacher = makeUser({ role: "teacher" });
  const classroom = createClassroom({ name: "CPE201" }, teacher);

  const csv1 = `email,group_name
s1@univ.ac.th,Alpha
s2@univ.ac.th,Alpha`;
  const { classroom: step1 } = applyRosterImport(classroom, parseRosterCsv(csv1));

  // Re-import with s1 moved to Gamma and new student s3
  const csv2 = `email,group_name
s1@univ.ac.th,Gamma
s2@univ.ac.th,Alpha
s3@univ.ac.th,Gamma`;
  const { classroom: step2, addedCount, updatedCount } = applyRosterImport(
    step1,
    parseRosterCsv(csv2),
  );

  assert.equal(addedCount, 1);
  assert.equal(updatedCount, 2);
  const s1 = step2.members.find((m) => m.email === "s1@univ.ac.th");
  const gammaGroup = step2.groups.find((g) => g.name === "Gamma");
  assert.ok(s1);
  assert.ok(gammaGroup);
  assert.equal(s1.group_id, gammaGroup.id);
});

test("FR-CLASS-06: Add co-teacher and TA, and cannot remove last owner", () => {
  const teacher = makeUser({ role: "teacher" });
  let classroom = createClassroom({ name: "CPE201" }, teacher);

  // Add co-teacher
  classroom = addStaffMember(
    classroom,
    { email: "ta1@univ.ac.th", name: "TA John", role: "TA" },
    teacher,
  );
  assert.equal(classroom.members.length, 2);
  const ta = classroom.members.find((m) => m.role === "TA");
  assert.ok(ta);

  // Try to remove the sole owner -> must reject (FR-CLASS-06)
  const ownerMember = classroom.members.find((m) => m.role === "OWNER");
  assert.ok(ownerMember);
  assert.throws(
    () => removeMember(classroom, ownerMember.id, teacher),
    /ไม่สามารถลบเจ้าของห้องเรียนคนสุดท้ายได้/,
  );

  // Removing TA succeeds
  classroom = removeMember(classroom, ta.id, teacher);
  assert.equal(classroom.members.length, 1);
});

test("FR-CLASS-07: Archive classroom sets status to ARCHIVED", () => {
  const teacher = makeUser({ role: "teacher" });
  let classroom = createClassroom({ name: "CPE201" }, teacher);

  classroom = archiveClassroom(classroom, teacher);
  assert.equal(classroom.status, "ARCHIVED");

  // Cannot import into archived classroom
  assert.throws(
    () =>
      applyRosterImport(
        classroom,
        parseRosterCsv("email,group_name\nx@a.com,G1\ny@a.com,G1"),
      ),
    /ไม่สามารถนำเข้ารายชื่อใน Classroom ที่ถูกเก็บถาวรแล้ว/,
  );
});
