import { AppError } from "@/shared/domain/app-error";
import type { AuditLogEntry, CreateAuditEntryInput } from "../types";
import {
  type AuditRepository,
  PostgresAuditRepository,
} from "./audit-repository";

export class AuditService {
  constructor(
    private readonly repository: AuditRepository = new PostgresAuditRepository(),
  ) {}

  async record(input: CreateAuditEntryInput): Promise<AuditLogEntry> {
    if (!input.actor_id) {
      throw new AppError("ต้องระบุ actor_id ในการบันทึก audit log", 400);
    }
    if (!input.action) {
      throw new AppError("ต้องระบุ action ในการบันทึก audit log", 400);
    }
    if (!input.resource_type || !input.resource_id) {
      throw new AppError(
        "ต้องระบุ resource_type และ resource_id ในการบันทึก audit log",
        400,
      );
    }

    // FR-AUDIT-02 / FR-ASSIGN-03 / FR-SCORE-08: บังคับกรอกเหตุผลสำหรับการ override คะแนน หรือ reopen
    if (
      (input.action === "SCORE_OVERRIDE" ||
        input.action === "ASSIGNMENT_REOPEN") &&
      (!input.reason || !input.reason.trim())
    ) {
      throw new AppError("กรุณาระบุเหตุผลในการดำเนินการ (FR-AUDIT-02)", 400);
    }

    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      actor_id: input.actor_id,
      action: input.action,
      resource_type: input.resource_type,
      resource_id: input.resource_id,
      classroom_id: input.classroom_id || null,
      assignment_id: input.assignment_id || null,
      before_state: input.before_state || null,
      after_state: input.after_state || null,
      reason: input.reason?.trim() || null,
      ip_address: input.ip_address || null,
      created_at: new Date().toISOString(),
    };

    await this.repository.record(entry);
    return entry;
  }

  async listByClassroom(
    classroomId: string,
    limit = 100,
  ): Promise<AuditLogEntry[]> {
    if (!classroomId) throw new AppError("ต้องระบุ classroomId", 400);
    return this.repository.listByClassroom(classroomId, limit);
  }

  async listByAssignment(
    assignmentId: string,
    limit = 100,
  ): Promise<AuditLogEntry[]> {
    if (!assignmentId) throw new AppError("ต้องระบุ assignmentId", 400);
    return this.repository.listByAssignment(assignmentId, limit);
  }
}
