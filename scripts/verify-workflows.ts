import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { assignmentGroupMembers, classroomMembers, classrooms, pairAssignments, users } from "../src/db/schema";
import { createAssignment, publishAssignment } from "../src/services/assignment-service";
import { enrollGroup, listAssignmentGroups } from "../src/services/group-service";
import { resolveAuthUser } from "../src/services/auth-user-service";
import { getClassroomRole } from "../src/lib/auth";

let phase = "disposable database safety checks";

async function verify() {
  const url = process.env.DATABASE_URL;
  if (!url || new URL(url).pathname !== "/paireval_test" || process.env.ALLOW_TEST_DATABASE !== "1") {
    throw new Error("Use an explicitly enabled disposable paireval_test database.");
  }
  const suffix = crypto.randomUUID();
  phase = "database fixture creation";
  const [teacher, ...students] = await db.insert(users).values(Array.from({ length: 4 }, (_, i) => ({
    emailNormalized: `workflow-${suffix}-${i}@example.com`, emailRaw: `workflow-${suffix}-${i}@example.com`,
  }))).returning();
  const [classroom] = await db.insert(classrooms).values({ name: "Workflow verification", slug: suffix, createdBy: teacher.id }).returning();
  await db.insert(classroomMembers).values([
    { classroomId: classroom.id, userId: teacher.id, role: "INSTRUCTOR" as const },
    ...students.map((student) => ({ classroomId: classroom.id, userId: student.id, role: "STUDENT" as const })),
  ]);
  const assignment = await createAssignment(classroom.id, teacher.id, { name: "Vote on group work" });
  phase = "assignment enrollment and isolation";
  const otherAssignment = await createAssignment(classroom.id, teacher.id, { name: "Separate assignment" });
  await assert.rejects(() => enrollGroup(-1, students[0].id, false, { name: "No assignment" }));
  const groups: { groupId: number }[] = [];
  for (const [i, student] of students.entries()) {
    groups.push(await enrollGroup(assignment.id, student.id, false, { name: `Group ${i + 1}`, description: "Synthetic answer" }));
  }
  const separate = await enrollGroup(otherAssignment.id, students[0].id, false, { name: "Group 1" });
  await assert.rejects(() => enrollGroup(assignment.id, students[0].id, false, { groupId: separate.groupId }));
  await assert.rejects(() => enrollGroup(assignment.id, students[0].id, false, { name: "Group 1" }));
  // A student stays in one group: no switching and no extra groups.
  await assert.rejects(() => enrollGroup(assignment.id, students[0].id, false, { groupId: groups[1].groupId }));
  await assert.rejects(() => enrollGroup(assignment.id, students[0].id, false, { name: "Second group" }));
  assert.equal((await listAssignmentGroups(assignment.id, students[0].id)).groups.length, 3);
  const teacherView = await listAssignmentGroups(assignment.id, teacher.id, true);
  assert.deepEqual(teacherView.groups.map((group) => group.members.length), [1, 1, 1]);
  phase = "publication concurrency and self-vote exclusion";
  const publishRuns = await Promise.allSettled([publishAssignment(assignment.id), publishAssignment(assignment.id)]);
  assert.equal(publishRuns.filter((run) => run.status === "fulfilled" && run.value.published).length, 1);
  assert.equal(publishRuns.filter((run) => run.status === "rejected").length, 1);
  await assert.rejects(() => enrollGroup(assignment.id, students[0].id, false, { name: "Too late" }));
  const pairs = await db.select().from(pairAssignments).where(eq(pairAssignments.assignmentId, assignment.id));
  assert.ok(pairs.length > 0);
  const members = await db.select().from(assignmentGroupMembers).where(eq(assignmentGroupMembers.assignmentId, assignment.id));
  for (const pair of pairs) {
    const ownGroup = members.find((member) => member.userId === pair.evaluatorUserId)?.groupId;
    assert.ok(ownGroup && ownGroup !== pair.itemAId && ownGroup !== pair.itemBId);
  }
  phase = "verified identity linking";
  const identity = { id: `subject-${suffix}`, email: teacher.emailRaw, name: "Synthetic user", emailVerified: false };
  assert.equal(await resolveAuthUser(identity), null, "unverified signup cannot claim an imported identity");
  assert.equal((await resolveAuthUser({ ...identity, emailVerified: true }))?.id, teacher.id);
  assert.equal(await resolveAuthUser({ ...identity, id: `attacker-${suffix}`, emailVerified: true }), null);
  phase = "managed teacher authorization (ENABLE_DEV_AUTH must be 0)";
  const originalTeachers = process.env.TEACHER_AUTH_IDS;
  try {
    process.env.TEACHER_AUTH_IDS = "";
    assert.equal(await getClassroomRole(classroom.id, teacher.id), null);
    process.env.TEACHER_AUTH_IDS = identity.id;
    assert.equal(await getClassroomRole(classroom.id, teacher.id), "INSTRUCTOR");
  } finally {
    if (originalTeachers === undefined) delete process.env.TEACHER_AUTH_IDS;
    else process.env.TEACHER_AUTH_IDS = originalTeachers;
  }
  console.log("PASS: real Postgres enrollment, assignment isolation, duplicate names, publication concurrency, self-vote exclusion, and identity linking.");
}

verify().catch(() => {
  console.error(`Workflow verification failed during ${phase}; no connection or identity details logged.`);
  process.exitCode = 1;
}).finally(() => db.$client.end({ timeout: 5 }));
