import test from "node:test";
import assert from "node:assert/strict";
import { AssignmentService } from "@/features/assignments/server/assignment-service";
import type { AssignmentRepository, AssignmentRecord } from "@/features/assignments/server/assignment-repository";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";
import { AuditService } from "@/features/audit/server/audit-service";
import type { AuditRepository } from "@/features/audit/server/audit-repository";
import type { AuditLogEntry } from "@/features/audit/types";

class FakeAuditRepository implements AuditRepository {
  public entries: AuditLogEntry[] = [];
  async record(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }
  async listByClassroom(): Promise<AuditLogEntry[]> {
    return this.entries;
  }
  async listByAssignment(): Promise<AuditLogEntry[]> {
    return this.entries;
  }
}

class FakeAssignmentRepository implements AssignmentRepository {
  public store = new Map<string, AssignmentRecord>();

  async listForUser(userId: string): Promise<Assignment[]> {
    return Array.from(this.store.values())
      .map((r) => r.assignment)
      .filter((a) => a.ownerId === userId || a.students.some((s) => s.id === userId));
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

function makeAssignment(owner: User, status: "draft" | "active" | "closed" | "finalized" = "closed"): Assignment {
  return {
    id: "asgn-123",
    ownerId: owner.id,
    title: "Project Milestone",
    description: "Pair evaluation",
    subject: "SE",
    code: "CODE12",
    deadline: new Date(Date.now() - 3600000).toISOString(), // expired
    status,
    questions: ["Quality", "Teamwork"],
    groups: [
      { id: "grp-1", name: "Team Alpha", members: [{ id: "std-1", name: "Student 1" }] },
      { id: "grp-2", name: "Team Beta", members: [{ id: "std-2", name: "Student 2" }] },
    ],
    students: [
      { id: "std-1", name: "Student 1" },
      { id: "std-2", name: "Student 2" },
    ],
    votes: [],
    createdAt: new Date().toISOString(),
    color: "#ffffff",
  };
}

test("FR-SCORE-08: Instructor can override score with mandatory reason and records audit log", async () => {
  const teacher: User = { id: "teacher-1", name: "Ajarn Somchai", email: "teacher@uni.ac.th", role: "teacher" };
  const student: User = { id: "std-1", name: "Student 1", email: "std1@uni.ac.th", role: "student" };
  const asgnRepo = new FakeAssignmentRepository();
  const auditRepo = new FakeAuditRepository();
  const auditService = new AuditService(auditRepo);
  const service = new AssignmentService(asgnRepo, () => "123456", undefined, auditService);

  const asgn = makeAssignment(teacher, "closed");
  await asgnRepo.create(asgn);

  // Student cannot override
  await assert.rejects(
    () =>
      service.execute(student, {
        action: "overrideScore",
        id: asgn.id,
        targetId: "std-1",
        targetType: "student",
        score: 9.5,
        reason: "Valid reason",
      }),
    { message: /เฉพาะครูเจ้าของงานเท่านั้น/ },
  );

  // Missing reason must fail (FR-SCORE-08)
  await assert.rejects(
    () =>
      service.execute(teacher, {
        action: "overrideScore",
        id: asgn.id,
        targetId: "std-1",
        targetType: "student",
        score: 9.5,
        reason: "   ",
      }),
    { message: /กรุณาระบุเหตุผลในการแก้ไขคะแนน/ },
  );

  // Success with valid reason
  await service.execute(teacher, {
    action: "overrideScore",
    id: asgn.id,
    targetId: "std-1",
    targetType: "student",
    score: 9.5,
    reason: "ปรับคะแนนตามผลการอุทธรณ์ เนื่องจากส่งงานตรงเวลาแต่ระบบขัดข้อง",
  });

  const updatedRecord = await asgnRepo.findById(asgn.id);
  assert.ok(updatedRecord);
  assert.equal(updatedRecord.assignment.scoreOverrides?.length, 1);
  assert.equal(updatedRecord.assignment.scoreOverrides[0].overriddenScore, 9.5);
  assert.equal(updatedRecord.assignment.scoreOverrides[0].targetId, "std-1");

  // Verify Audit Log
  const auditEntries = auditRepo.entries.filter((e) => e.action === "SCORE_OVERRIDE");
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].actor_id, teacher.id);
  assert.equal(auditEntries[0].assignment_id, asgn.id);
  assert.equal(auditEntries[0].reason, "ปรับคะแนนตามผลการอุทธรณ์ เนื่องจากส่งงานตรงเวลาแต่ระบบขัดข้อง");
});

test("FR-SCORE-09: Finalize snapshots inputs and outputs, locks assignment, and records audit log", async () => {
  const teacher: User = { id: "teacher-1", name: "Ajarn Somchai", email: "teacher@uni.ac.th", role: "teacher" };
  const asgnRepo = new FakeAssignmentRepository();
  const auditRepo = new FakeAuditRepository();
  const auditService = new AuditService(auditRepo);
  const service = new AssignmentService(asgnRepo, () => "123456", undefined, auditService);

  const asgn = makeAssignment(teacher, "closed");
  await asgnRepo.create(asgn);

  // Finalize assignment
  await service.execute(teacher, {
    action: "finalize",
    id: asgn.id,
  });

  const updatedRecord = await asgnRepo.findById(asgn.id);
  assert.ok(updatedRecord);
  assert.equal(updatedRecord.assignment.status, "finalized");
  assert.ok(updatedRecord.assignment.finalizedSnapshot);
  assert.equal(updatedRecord.assignment.finalizedSnapshot.finalizedBy, teacher.id);
  assert.deepEqual(updatedRecord.assignment.finalizedSnapshot.inputs.questions, asgn.questions);
  assert.deepEqual(updatedRecord.assignment.finalizedSnapshot.inputs.groups, asgn.groups);

  // Verify Audit Log
  const auditEntries = auditRepo.entries.filter((e) => e.action === "ASSIGNMENT_FINALIZE");
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].actor_id, teacher.id);
  assert.equal(auditEntries[0].assignment_id, asgn.id);
  assert.deepEqual(auditEntries[0].after_state, { status: "finalized" });
});

test("FR-ASSIGN-03: Reopen finalized assignment requires mandatory reason and records audit log", async () => {
  const teacher: User = { id: "teacher-1", name: "Ajarn Somchai", email: "teacher@uni.ac.th", role: "teacher" };
  const asgnRepo = new FakeAssignmentRepository();
  const auditRepo = new FakeAuditRepository();
  const auditService = new AuditService(auditRepo);
  const service = new AssignmentService(asgnRepo, () => "123456", undefined, auditService);

  const asgn = makeAssignment(teacher, "finalized");
  await asgnRepo.create(asgn);

  // Missing reason must fail
  await assert.rejects(
    () =>
      service.execute(teacher, {
        action: "reopen",
        id: asgn.id,
        reason: "",
      }),
    { message: /กรุณาระบุเหตุผลในการเปิดประเมินใหม่/ },
  );

  // Success with reason
  await service.execute(teacher, {
    action: "reopen",
    id: asgn.id,
    reason: "เปิดระบบใหม่เพื่อให้นักศึกษา 2 คนที่ติดธุระสำคัญส่งงาน",
  });

  const updatedRecord = await asgnRepo.findById(asgn.id);
  assert.ok(updatedRecord);
  assert.equal(updatedRecord.assignment.status, "closed");
  assert.equal(updatedRecord.assignment.reopenReason, "เปิดระบบใหม่เพื่อให้นักศึกษา 2 คนที่ติดธุระสำคัญส่งงาน");

  // Verify Audit Log
  const auditEntries = auditRepo.entries.filter((e) => e.action === "ASSIGNMENT_REOPEN");
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].actor_id, teacher.id);
  assert.equal(auditEntries[0].assignment_id, asgn.id);
  assert.equal(auditEntries[0].reason, "เปิดระบบใหม่เพื่อให้นักศึกษา 2 คนที่ติดธุระสำคัญส่งงาน");
});
