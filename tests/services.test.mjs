import test from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "../src/features/auth/server/auth-service.ts";
import { AssignmentService } from "../src/features/assignments/server/assignment-service.ts";
import { visibleAssignment } from "../src/features/assignments/domain/assignment-visibility.ts";
const teacher = {
  id: "teacher",
  name: "Teacher",
  email: "t@example.com",
  role: "teacher",
};
const student = {
  id: "s1",
  name: "Student",
  email: "s@example.com",
  role: "student",
};
function activeAssignment() {
  return {
    id: "a",
    ownerId: teacher.id,

    status: "active",
    deadline: new Date(Date.now() + 86400000).toISOString(),
    questions: ["Content"],
    students: [student, { id: "s2", name: "Other" }],
    groups: [
      { id: "g1", name: "One", members: [student] },
      { id: "g2", name: "Two", members: [{ id: "s2", name: "Other" }] },
    ],
    votes: [],
  };
}
test("service retries a conflicting update using the latest version", async () => {
  let version = 0;
  let data = activeAssignment();
  let calls = 0;
  const repository = {
    findById: async () => ({ assignment: structuredClone(data), version }),
    update: async (updated, expected) => {
      calls++;
      if (calls === 1) {
        version++;
        return false;
      }
      assert.equal(expected, version);
      data = updated;
      return true;
    },
  };
  const service = new AssignmentService(repository);
  await service.execute(student, {
    id: "a",
    action: "vote",
    groupId: "g2",
    scores: [5],
  });
  assert.equal(calls, 2);
  assert.equal(data.votes.length, 1);
});
test("concurrent duplicate submission is revalidated after a conflict", async () => {
  let data = activeAssignment();
  const repository = {
    findById: async () => ({ assignment: structuredClone(data), version: 0 }),
    update: async (updated) => {
      data = updated;
      return false;
    },
  };
  const service = new AssignmentService(repository);
  await assert.rejects(
    () =>
      service.execute(student, {
        id: "a",
        action: "vote",
        groupId: "g2",
        scores: [5],
      }),
    /คุณโหวตกลุ่มนี้แล้ว/,
  );
  assert.equal(data.votes.length, 1);
});
test("student sees only own ballots while voting; identities are hidden after close", () => {
  const data = activeAssignment();
  data.votes = [
    { userId: "s2", groupId: "g1", scores: [4] },
    { userId: "s1", groupId: "g2", scores: [5] },
  ];
  assert.equal(visibleAssignment(data, "s1").votes.length, 1);
  assert.equal(visibleAssignment(data, "teacher").votes.length, 2);
  data.status = "closed";
  assert.deepEqual(
    visibleAssignment(data, "s1").votes.map((vote) => vote.userId),
    ["anonymous", "s1"],
  );
});
test("auth hashes passwords and never returns the hash in its response", async () => {
  let stored;
  const repository = {
    create: async (user, password_hash) => {
      stored = { ...user, password_hash };
      return user;
    },
    findByEmail: async () => stored,
  };
  const auth = new AuthService(repository);
  const created = await auth.authenticate({
    action: "register",
    name: "Teacher",
    email: "T@example.com",
    password: "test-password",
    role: "teacher",
  });
  assert.equal(created.email, "t@example.com");
  assert.equal(created.password_hash, undefined);
  assert.notEqual(stored.password_hash, "test-password");
  const loggedIn = await auth.authenticate({
    action: "login",
    email: "t@example.com",
    password: "test-password",
  });
  assert.equal(loggedIn.id, created.id);
  assert.equal(loggedIn.password_hash, undefined);
  await assert.rejects(
    () =>
      auth.authenticate({
        action: "login",
        email: "t@example.com",
        password: "wrong-password",
      }),
    /อีเมลหรือรหัสผ่านไม่ถูกต้อง/,
  );
});
