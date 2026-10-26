import test from "node:test";
import assert from "node:assert/strict";
import { AuditService } from "@/features/audit/server/audit-service";
import type { AuditRepository } from "@/features/audit/server/audit-repository";
import type { AuditLogEntry } from "@/features/audit/types";
import {
  submitAppeal,
  resolveAppeal,
} from "@/features/assignments/domain/appeals";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";

class InMemoryAuditRepository implements AuditRepository {
  public records: AuditLogEntry[] = [];

  async record(entry: AuditLogEntry): Promise<void> {
    this.records.push(entry);
  }

  async listByClassroom(
    classroomId: string,
    limit = 100,
  ): Promise<AuditLogEntry[]> {
    return this.records
      .filter((r) => r.classroom_id === classroomId)
      .slice(0, limit);
  }

  async listByAssignment(
    assignmentId: string,
    limit = 100,
  ): Promise<AuditLogEntry[]> {
    return this.records
      .filter((r) => r.assignment_id === assignmentId)
      .slice(0, limit);
  }
}

const teacher: User = {
  id: "teacher-1",
  name: "Teacher One",
  email: "teacher@uni.ac.th",
  role: "teacher",
};

const student: User = {
  id: "student-1",
  name: "Student One",
  email: "student@uni.ac.th",
  role: "student",
};

function fixture(overrides: Partial<Assignment> = {}): Assignment {
  const finalizedAt = new Date().toISOString();
  return {
    id: "asgn-audit-1",
    ownerId: teacher.id,
    title: "Project Beta",
    description: "Testing appeals and audit",
    subject: "SE",
    deadline: new Date(Date.now() - 3600000).toISOString(),
    status: "finalized",
    questions: ["Quality"],
    groups: [
      { id: "g1", name: "Team 1", members: [student] },
      {
        id: "g2",
        name: "Team 2",
        members: [{ id: "s2", name: "Student Two" }],
      },
    ],
    students: [student, { id: "s2", name: "Student Two" }],
    votes: [],
    finalizedSnapshot: {
      finalizedAt,
      finalizedBy: teacher.id,
      inputs: { votes: [], groups: [], questions: ["Quality"] },
      outputs: { overrides: [] },
    },
    groupMaxScore: 15,
    individualMaxScore: 5,
    createdAt: new Date().toISOString(),
    color: "mint",
    ...overrides,
  };
}

test("FR-APPEAL-01: student can submit appeal within 7-day window; rejected after 7 days or before finalized", () => {
  const asgn = fixture();
  const finalizedTime = Date.parse(asgn.finalizedSnapshot!.finalizedAt);

  // 1. Unfinalized assignment rejects appeal
  const draftAsgn = fixture({ status: "active", finalizedSnapshot: undefined });
  assert.throws(
    () =>
      submitAppeal(draftAsgn, student, {
        message: "Need review",
        expectedFinalizedAt: "2026-01-01T00:00:00Z",
      }),
    /ยื่นและพิจารณาอุทธรณ์ได้หลัง Finalize เท่านั้น/,
  );

  // 2. Submit appeal on day 3 -> Success
  const day3 = finalizedTime + 3 * 24 * 60 * 60 * 1000;
  submitAppeal(
    asgn,
    student,
    {
      message: "Please review my individual evaluation contributions",
      expectedFinalizedAt: asgn.finalizedSnapshot!.finalizedAt,
    },
    day3,
  );
  assert.equal(asgn.appeals?.length, 1);
  assert.equal(
    asgn.appeals![0].message,
    "Please review my individual evaluation contributions",
  );

  // 3. Duplicate appeal in same cycle rejected
  assert.throws(
    () =>
      submitAppeal(
        asgn,
        student,
        {
          message: "Another try",
          expectedFinalizedAt: asgn.finalizedSnapshot!.finalizedAt,
        },
        day3,
      ),
    /คุณยื่นอุทธรณ์สำหรับผลคะแนนรอบนี้แล้ว/,
  );

  // 4. Submit appeal after 7 days (day 8) -> Rejected
  const asgnDay8 = fixture();
  const day8 = finalizedTime + 8 * 24 * 60 * 60 * 1000;
  assert.throws(
    () =>
      submitAppeal(
        asgnDay8,
        student,
        {
          message: "Late appeal",
          expectedFinalizedAt: asgnDay8.finalizedSnapshot!.finalizedAt,
        },
        day8,
      ),
    /หมดเวลายื่นอุทธรณ์ \(ภายใน 7 วันหลัง Finalize\)/,
  );
});

test("FR-APPEAL-02: instructor resolves appeal via uphold or override with response", () => {
  const asgn = fixture();
  submitAppeal(asgn, student, {
    message: "Scores seem low",
    expectedFinalizedAt: asgn.finalizedSnapshot!.finalizedAt,
  });
  const appealId = asgn.appeals![0].id;

  // Student cannot resolve appeal
  assert.throws(
    () =>
      resolveAppeal(asgn, student, {
        appealId,
        expectedFinalizedAt: asgn.finalizedSnapshot!.finalizedAt,
        outcome: "uphold",
        response: "Self resolution attempt",
      }),
    /เฉพาะอาจารย์เจ้าของ Assignment เท่านั้น/,
  );

  // Teacher resolves with override
  resolveAppeal(asgn, teacher, {
    appealId,
    expectedFinalizedAt: asgn.finalizedSnapshot!.finalizedAt,
    outcome: "override",
    score: 18.5,
    response: "Reviewed peer feedback and adjusted final score",
  });

  const resolved = asgn.appeals![0];
  assert.ok(resolved.decision);
  assert.equal(resolved.decision.outcome, "override");
  assert.equal(resolved.decision.score, 18.5);
  assert.equal(
    resolved.decision.response,
    "Reviewed peer feedback and adjusted final score",
  );

  // Resolving already decided appeal is rejected
  assert.throws(
    () =>
      resolveAppeal(asgn, teacher, {
        appealId,
        expectedFinalizedAt: asgn.finalizedSnapshot!.finalizedAt,
        outcome: "uphold",
        response: "Try again",
      }),
    /คำร้องนี้พิจารณาแล้ว/,
  );
});

test("FR-AUDIT-01 & FR-AUDIT-02: Audit records all required events with complete metadata and enforces reasons", async () => {
  const repo = new InMemoryAuditRepository();
  const service = new AuditService(repo);

  // Mandatory reason enforcement
  for (const action of [
    "SCORE_OVERRIDE",
    "ASSIGNMENT_REOPEN",
    "ASSIGNMENT_UNPUBLISH",
    "PAIRS_REGENERATE",
  ] as const) {
    await assert.rejects(
      () =>
        service.record({
          actor_id: teacher.id,
          action,
          resource_type: "assignment",
          resource_id: "asgn-1",
          reason: "   ", // empty
        }),
      /กรุณาระบุเหตุผลในการดำเนินการ \(FR-AUDIT-02\)/,
    );
  }

  // Record all 7 core activities required by FR-AUDIT-01
  const actions: import("@/features/audit/types").AuditAction[] = [
    "ASSIGNMENT_PUBLISH",
    "ASSIGNMENT_UNPUBLISH",
    "PAIRS_REGENERATE",
    "SCORE_OVERRIDE",
    "ASSIGNMENT_FINALIZE",
    "ASSIGNMENT_REOPEN",
    "EXPORT_IDENTITY",
    "VIEW_EVALUATOR_IDENTITY",
    "ROLE_CHANGE",
  ];

  for (const action of actions) {
    const entry = await service.record({
      actor_id: teacher.id,
      action,
      resource_type: "assignment",
      resource_id: "asgn-1",
      classroom_id: "cls-1",
      assignment_id: "asgn-1",
      reason: "Mandatory or voluntary explanation provided",
      ip_address: "192.168.1.100",
      before_state: { version: 1 },
      after_state: { version: 2 },
    });

    // FR-AUDIT-02: verify completeness of record fields
    assert.ok(entry.id);
    assert.equal(entry.actor_id, teacher.id);
    assert.equal(entry.action, action);
    assert.equal(entry.resource_type, "assignment");
    assert.equal(entry.resource_id, "asgn-1");
    assert.equal(entry.classroom_id, "cls-1");
    assert.equal(entry.assignment_id, "asgn-1");
    assert.equal(entry.ip_address, "192.168.1.100");
    assert.equal(entry.reason, "Mandatory or voluntary explanation provided");
    assert.ok(Date.parse(entry.created_at) > 0);
  }

  assert.equal(repo.records.length, actions.length);
  const byAssignment = await service.listByAssignment("asgn-1");
  assert.equal(byAssignment.length, actions.length);
});

test("FR-AUDIT-03: Append-only integrity (no delete or update capabilities)", () => {
  const repo = new InMemoryAuditRepository();
  const service = new AuditService(repo);

  // Neither AuditService nor AuditRepository expose update or delete methods
  assert.equal(
    (service as unknown as Record<string, unknown>).update,
    undefined,
  );
  assert.equal(
    (service as unknown as Record<string, unknown>).delete,
    undefined,
  );
  assert.equal((repo as unknown as Record<string, unknown>).update, undefined);
  assert.equal((repo as unknown as Record<string, unknown>).delete, undefined);
});

test("FR-AUDIT-02: Safe Client IP extraction and anti-spoofing", async () => {
  const { extractClientIp, isValidIp } = await import("@/shared/server/http");

  assert.equal(isValidIp("192.168.1.1"), true);
  assert.equal(isValidIp("203.0.113.195"), true);
  assert.equal(isValidIp("::1"), true);
  assert.equal(isValidIp("invalid-ip"), false);
  assert.equal(isValidIp("192.168.1.1<script>"), false);
  assert.equal(isValidIp("999.999.999.999"), false);

  // Single valid x-forwarded-for
  const req1 = new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": "203.0.113.50" },
  });
  assert.equal(extractClientIp(req1), "203.0.113.50");

  // Comma-delimited list: picks the first valid client IP
  const req2 = new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": "203.0.113.50, 10.0.0.1, 192.168.1.1" },
  });
  assert.equal(extractClientIp(req2), "203.0.113.50");

  // Spoofed or malformed header falls back to x-real-ip or default
  const req3 = new Request("http://localhost/api/test", {
    headers: {
      "x-forwarded-for": "malformed_ip_injection",
      "x-real-ip": "198.51.100.22",
    },
  });
  assert.equal(extractClientIp(req3), "198.51.100.22");

  // No headers falls back to 127.0.0.1
  const req4 = new Request("http://localhost/api/test");
  assert.equal(extractClientIp(req4), "127.0.0.1");
});

test("FR-AUDIT-03: PostgreSQL schema defines append-only trigger on audit_logs", async () => {
  const fs = await import("node:fs/promises");
  const schemaSql = await fs.readFile(
    new URL("../../scripts/schema.sql", import.meta.url),
    "utf8",
  );

  assert.ok(
    schemaSql.includes("prevent_audit_logs_mutation"),
    "Must define prevent_audit_logs_mutation function in schema",
  );
  assert.ok(
    schemaSql.includes("CREATE TRIGGER trg_audit_logs_immutable"),
    "Must attach trg_audit_logs_immutable trigger",
  );
  assert.ok(
    schemaSql.includes("BEFORE UPDATE OR DELETE ON audit_logs"),
    "Trigger must fire BEFORE UPDATE OR DELETE on audit_logs",
  );
});
