import test from "node:test";
import assert from "node:assert/strict";
import { AuditService } from "@/features/audit/server/audit-service";
import type { AuditRepository } from "@/features/audit/server/audit-repository";
import type { AuditLogEntry } from "@/features/audit/types";
import { ClassroomService } from "@/features/classroom/server/classroom-service";
import type {
  ClassroomRepository,
  ClassroomRecord,
} from "@/features/classroom/server/classroom-repository";
import type { Classroom } from "@/features/classroom/types";
import type { User } from "@/features/auth/types";

class FakeAuditRepository implements AuditRepository {
  public entries: AuditLogEntry[] = [];

  async record(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  async listByClassroom(
    classroomId: string,
    limit = 100,
  ): Promise<AuditLogEntry[]> {
    return this.entries
      .filter((e) => e.classroom_id === classroomId)
      .slice(0, limit);
  }

  async listByAssignment(
    assignmentId: string,
    limit = 100,
  ): Promise<AuditLogEntry[]> {
    return this.entries
      .filter((e) => e.assignment_id === assignmentId)
      .slice(0, limit);
  }
}

class FakeClassroomRepository implements ClassroomRepository {
  public store = new Map<string, ClassroomRecord>();

  async listForUser(userId: string): Promise<Classroom[]> {
    return Array.from(this.store.values())
      .map((r) => r.classroom)
      .filter(
        (c) =>
          c.created_by === userId ||
          c.members.some((m) => m.user_id === userId),
      );
  }

  async findById(id: string): Promise<ClassroomRecord | null> {
    return this.store.get(id) || null;
  }

  async findBySlug(slug: string): Promise<ClassroomRecord | null> {
    return (
      Array.from(this.store.values()).find((r) => r.classroom.slug === slug) ||
      null
    );
  }

  async create(classroom: Classroom): Promise<boolean> {
    this.store.set(classroom.id, { classroom, version: 1 });
    return true;
  }

  async update(classroom: Classroom, version: number): Promise<boolean> {
    const cur = this.store.get(classroom.id);
    if (!cur || cur.version !== version) return false;
    this.store.set(classroom.id, { classroom, version: version + 1 });
    return true;
  }
}

test("FR-AUDIT-01 & FR-AUDIT-02: Records audit log with actor, action, resource, before/after, and UTC timestamp", async () => {
  const fakeRepo = new FakeAuditRepository();
  const service = new AuditService(fakeRepo);

  const entry = await service.record({
    actor_id: "user-123",
    action: "ASSIGNMENT_PUBLISH",
    resource_type: "assignment",
    resource_id: "asgn-456",
    classroom_id: "cls-789",
    ip_address: "127.0.0.1",
    before_state: { status: "DRAFT" },
    after_state: { status: "PUBLISHED" },
  });

  assert.ok(entry.id);
  assert.equal(entry.actor_id, "user-123");
  assert.equal(entry.action, "ASSIGNMENT_PUBLISH");
  assert.equal(entry.resource_type, "assignment");
  assert.equal(entry.resource_id, "asgn-456");
  assert.equal(entry.classroom_id, "cls-789");
  assert.equal(entry.ip_address, "127.0.0.1");
  assert.deepEqual(entry.before_state, { status: "DRAFT" });
  assert.deepEqual(entry.after_state, { status: "PUBLISHED" });
  assert.ok(Date.parse(entry.created_at) > 0);
  assert.equal(fakeRepo.entries.length, 1);
});

test("FR-AUDIT-02: Requires reason for SCORE_OVERRIDE and ASSIGNMENT_REOPEN", async () => {
  const fakeRepo = new FakeAuditRepository();
  const service = new AuditService(fakeRepo);

  // SCORE_OVERRIDE without reason must fail
  await assert.rejects(
    () =>
      service.record({
        actor_id: "user-123",
        action: "SCORE_OVERRIDE",
        resource_type: "student_score",
        resource_id: "target-student-1",
        reason: "",
      }),
    { message: /กรุณาระบุเหตุผลในการดำเนินการ/ },
  );

  // ASSIGNMENT_REOPEN without reason must fail
  await assert.rejects(
    () =>
      service.record({
        actor_id: "user-123",
        action: "ASSIGNMENT_REOPEN",
        resource_type: "assignment",
        resource_id: "asgn-456",
        reason: "   ",
      }),
    { message: /กรุณาระบุเหตุผลในการดำเนินการ/ },
  );

  // With reason must succeed
  const override = await service.record({
    actor_id: "user-123",
    action: "SCORE_OVERRIDE",
    resource_type: "student_score",
    resource_id: "target-student-1",
    reason: "อุทธรณ์ผ่านการพิจารณา เนื่องจากส่งผลงานเพิ่มเติมตรงเวลา",
  });
  assert.equal(override.action, "SCORE_OVERRIDE");
  assert.equal(
    override.reason,
    "อุทธรณ์ผ่านการพิจารณา เนื่องจากส่งผลงานเพิ่มเติมตรงเวลา",
  );
});

test("FR-AUDIT-03: Append-only integrity (no delete or update APIs exist)", () => {
  const fakeRepo = new FakeAuditRepository();
  const service = new AuditService(fakeRepo);

  // Validate that no delete or update methods exist on service or repository
  assert.equal(
    (service as unknown as Record<string, unknown>).delete,
    undefined,
  );
  assert.equal(
    (service as unknown as Record<string, unknown>).update,
    undefined,
  );
  assert.equal(
    (fakeRepo as unknown as Record<string, unknown>).delete,
    undefined,
  );
  assert.equal(
    (fakeRepo as unknown as Record<string, unknown>).update,
    undefined,
  );
});

test("FR-AUDIT-01: ClassroomService records ROLE_CHANGE when staff is added", async () => {
  const fakeAuditRepo = new FakeAuditRepository();
  const auditService = new AuditService(fakeAuditRepo);
  const classroomRepo = new FakeClassroomRepository();
  const classroomService = new ClassroomService(classroomRepo, auditService);

  const teacher: User = {
    id: "teacher-1",
    name: "Ajarn Somchai",
    email: "somchai@uni.ac.th",
    role: "teacher",
  };
  const classroom = await classroomService.create(teacher, {
    name: "Software Engineering",
  });

  await classroomService.addStaff(teacher, classroom.id, {
    email: "ta@uni.ac.th",
    name: "TA Somying",
    role: "TA",
  });

  const auditEntries = fakeAuditRepo.entries;
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].action, "ROLE_CHANGE");
  assert.equal(auditEntries[0].actor_id, teacher.id);
  assert.equal(auditEntries[0].classroom_id, classroom.id);
  assert.deepEqual(auditEntries[0].after_state, {
    email: "ta@uni.ac.th",
    role: "TA",
  });
});
