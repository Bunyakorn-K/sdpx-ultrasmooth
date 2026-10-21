import test from "node:test";
import assert from "node:assert/strict";
import { AssignmentService } from "@/features/assignments/server/assignment-service";
import type { AssignmentRepository, AssignmentRecord } from "@/features/assignments/server/assignment-repository";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";

class FakeAssignmentRepository implements AssignmentRepository {
  public store = new Map<string, AssignmentRecord>();

  async listForUser(userId: string): Promise<Assignment[]> {
    return Array.from(this.store.values())
      .map((r) => r.assignment)
      .filter((a) => a.ownerId === userId);
  }

  async findById(id: string): Promise<AssignmentRecord | null> {
    return this.store.get(id) || null;
  }

  async findByCode(code: string): Promise<AssignmentRecord | null> {
    return Array.from(this.store.values()).find((r) => r.assignment.code === code) || null;
  }

  async create(assignment: Assignment): Promise<boolean> {
    this.store.set(assignment.id, { assignment, version: 1 });
    return true;
  }

  async update(assignment: Assignment, version: number): Promise<boolean> {
    const cur = this.store.get(assignment.id);
    if (!cur || cur.version !== version) return false;
    this.store.set(assignment.id, { assignment, version: version + 1 });
    return true;
  }
}

test("FR-ASSIGN-04: Extends deadline anytime, including after original deadline has passed", async () => {
  const teacher: User = { id: "t-1", name: "Teacher", email: "t@uni.ac.th", role: "teacher" };
  const repo = new FakeAssignmentRepository();
  const service = new AssignmentService(repo, () => "111222");

  // Assignment whose original deadline passed 1 hour ago
  const pastDeadline = new Date(Date.now() - 3600000).toISOString();
  const asgn: Assignment = {
    id: "asgn-ext",
    ownerId: teacher.id,
    title: "Test Extension",
    description: "Extending deadline",
    subject: "SE",
    code: "EXT001",
    deadline: pastDeadline,
    status: "closed",
    questions: ["Q1"],
    groups: [],
    students: [],
    votes: [],
    createdAt: new Date().toISOString(),
    color: "#fff",
  };
  await repo.create(asgn);

  // Extend to 2 days in the future
  const futureDeadline = new Date(Date.now() + 172800000).toISOString();
  await service.execute(teacher, {
    action: "updateDeadline",
    id: asgn.id,
    deadline: futureDeadline,
  });

  const updated = (await repo.findById(asgn.id))?.assignment;
  assert.ok(updated);
  assert.equal(updated.deadline, new Date(futureDeadline).toISOString());
  assert.equal(updated.status, "active");
});

test("FR-ASSIGN-04: Shortening deadline allowed only before original deadline arrives", async () => {
  const teacher: User = { id: "t-1", name: "Teacher", email: "t@uni.ac.th", role: "teacher" };
  const repo = new FakeAssignmentRepository();
  const service = new AssignmentService(repo, () => "111222");

  // Case 1: Original deadline is 7 days in future. Shorten to 3 days in future -> Allowed
  const originalFuture = new Date(Date.now() + 7 * 86400000).toISOString();
  const asgnFuture: Assignment = {
    id: "asgn-short-ok",
    ownerId: teacher.id,
    title: "Test Shortening Allowed",
    description: "Shorten future",
    subject: "SE",
    code: "SHT001",
    deadline: originalFuture,
    status: "active",
    questions: ["Q1"],
    groups: [],
    students: [],
    votes: [],
    createdAt: new Date().toISOString(),
    color: "#fff",
  };
  await repo.create(asgnFuture);

  const shortenedFuture = new Date(Date.now() + 3 * 86400000).toISOString();
  await service.execute(teacher, {
    action: "updateDeadline",
    id: asgnFuture.id,
    deadline: shortenedFuture,
  });

  const updatedOk = (await repo.findById(asgnFuture.id))?.assignment;
  assert.equal(updatedOk?.deadline, new Date(shortenedFuture).toISOString());

  // Case 2: Original deadline has already passed. Trying to shorten even further -> Rejected (FR-ASSIGN-04)
  const pastDeadline = new Date(Date.now() - 3600000).toISOString();
  const asgnPast: Assignment = {
    id: "asgn-short-fail",
    ownerId: teacher.id,
    title: "Test Shortening Failed",
    description: "Shorten past",
    subject: "SE",
    code: "SHT002",
    deadline: pastDeadline,
    status: "closed",
    questions: ["Q1"],
    groups: [],
    students: [],
    votes: [],
    createdAt: new Date().toISOString(),
    color: "#fff",
  };
  await repo.create(asgnPast);

  const evenEarlierPast = new Date(Date.now() - 7200000).toISOString();
  await assert.rejects(
    () =>
      service.execute(teacher, {
        action: "updateDeadline",
        id: asgnPast.id,
        deadline: evenEarlierPast,
      }),
    { message: /ไม่สามารถร่นกำหนดส่งได้เนื่องจากเลยกำหนดส่งเดิมแล้ว/ },
  );
});
