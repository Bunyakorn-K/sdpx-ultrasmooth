import test from "node:test";
import assert from "node:assert/strict";
import { makeUser, makeAssignment } from "../factories";
import {
  createClassroom,
  applyRosterImport,
} from "@/features/classroom/domain/classroom";
import { parseRosterCsv } from "@/features/classroom/domain/roster-parser";
import { applyClassroomRoster } from "@/features/assignments/domain/classroom-roster";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import { verifyPassword } from "@/features/auth/server/password-service";
import { ROSTER_PENDING_PASSWORD } from "@/features/auth/domain/pending-account";

test("classroom CSV governs every draft; students cannot create or choose assignment groups", () => {
  const teacher = makeUser({ role: "teacher" });
  const classroom = applyRosterImport(
    createClassroom({ name: "KMITL" }, teacher),
    parseRosterCsv(
      "email,group_name,student_id,display_name\ns1@kmitl.ac.th,Group 1,67015001,Student 1\ns2@kmitl.ac.th,Group 2,67015002,Student 2",
    ),
  ).classroom;
  const original = makeAssignment({ ownerId: teacher.id, status: "draft" });
  const a = applyClassroomRoster(original, classroom);
  assert.equal(a.classroomRosterManaged, true);
  assert.equal(a.classroomId, classroom.id);
  assert.equal(a.students.length, 2);
  assert.equal(a.groups[0].id, classroom.groups[0].id);
  const member = classroom.members.find((m) => m.email === "s1@kmitl.ac.th")!;
  const student = makeUser({
    id: member.user_id,
    email: member.email,
    role: "student",
  });
  assert.equal(a.groups[0].members[0].id, student.id);
  assert.throws(
    () => applyAssignmentCommand(structuredClone(a), student, "join", {}),
    /ไม่พบการทำงาน/,
  );
  assert.equal(a.students.length, 2);
  for (const user of [teacher, student]) {
    assert.throws(
      () =>
        applyAssignmentCommand(structuredClone(a), user, "group", {
          name: "Other",
        }),
      /CSV/,
    );
    assert.throws(
      () =>
        applyAssignmentCommand(structuredClone(a), user, "joinGroup", {
          groupId: a.groups[1].id,
        }),
      /อาจารย์จัดกลุ่ม/,
    );
  }
  assert.throws(
    () =>
      applyAssignmentCommand(
        structuredClone(a),
        makeUser({ role: "student" }),
        "join",
        {},
      ),
    /ไม่พบการทำงาน/,
  );
  assert.deepEqual(original.groups, makeAssignment().groups);
  const updated = applyRosterImport(
    classroom,
    parseRosterCsv("email,group_name\ns1@kmitl.ac.th,Group 2"),
  ).classroom;
  const next = applyClassroomRoster(a, updated);
  assert.equal(next.groups[0].members.length, 0);
  assert.equal(next.groups[1].members.length, 2);
  for (const status of ["active", "closed", "finalized"] as const) {
    const published = { ...a, status };
    assert.equal(applyClassroomRoster(published, updated), published);
  }
});

test("pending roster identities cannot sign in before the student registers", async () => {
  assert.equal(
    await verifyPassword("anything", ROSTER_PENDING_PASSWORD),
    false,
  );
});
