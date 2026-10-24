import type { User } from "@/features/auth/types";
import type { AuditService } from "@/features/audit/server/audit-service";
import type { ClassroomRepository } from "@/features/classroom/server/classroom-repository";
import { AppError } from "@/shared/domain/app-error";
import { applyAssignmentCommand } from "../domain/assignment-policy";
import { visibleAssignment } from "../domain/assignment-visibility";
import { createAssignment } from "../domain/create-assignment";
import type { Assignment } from "../types";
import type { AssignmentRepository } from "./assignment-repository";

import { assignmentEvent } from "@/features/notifications/domain/notification-policy";

const MAX_RETRIES = 5;

export class AssignmentService {
  constructor(
    private readonly repository: AssignmentRepository,
    private readonly generateCode: () => string,
    private readonly classroomRepository?: ClassroomRepository,
    private readonly auditService?: AuditService,
  ) {}

  async list(user: User) {
    return (await this.repository.listForUser(user.id, user.email)).map(
      (assignment) => visibleAssignment(assignment, user.id),
    );
  }

  async get(user: User, id: string) {
    const record = await this.repository.findById(id);
    if (!record) throw new AppError("ไม่พบ assignment", 404);
    const assignment = record.assignment;
    const isOwner = assignment.ownerId === user.id;
    const isJoined = assignment.students.some(
      (student) => student.id === user.id,
    );
    if (!isOwner && !isJoined) {
      const hasAccess = await this.checkClassroomAccess(user, assignment);
      if (!hasAccess) {
        throw new AppError("คุณไม่มีสิทธิ์เข้าถึง assignment นี้", 403);
      }
    }
    return visibleAssignment(assignment, user.id);
  }

  async execute(user: User, input: Record<string, unknown>) {
    if (input.action === "create") return this.create(user, input);
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const record = await this.findForCommand(input);
      if (!record) throw new AppError("ไม่พบ assignment", 404);
      if (
        input.action !== "join" &&
        record.assignment.ownerId !== user.id &&
        !record.assignment.students.some((s) => s.id === user.id)
      ) {
        const hasAccess = await this.checkClassroomAccess(
          user,
          record.assignment,
        );
        if (!hasAccess) {
          throw new AppError("คุณไม่มีสิทธิ์เข้าถึง assignment นี้", 403);
        }
      }
      const previousStatus = record.assignment.status;
      const updated = applyAssignmentCommand(
        record.assignment,
        user,
        String(input.action),
        input,
      );
      if (
        await this.repository.update(
          updated,
          record.version,
          assignmentEvent(previousStatus, updated, record.version),
        )
      ) {
        if (input.action === "overrideScore") {
          await this.auditService
            ?.record({
              actor_id: user.id,
              action: "SCORE_OVERRIDE",
              resource_type: "assignment_score",
              resource_id: String(input.targetId),
              assignment_id: updated.id,
              classroom_id: updated.classroomId || null,
              reason: String(input.reason || ""),
              after_state: { score: input.score, targetId: input.targetId },
            })
            .catch(() => {});
        } else if (input.action === "finalize") {
          await this.auditService
            ?.record({
              actor_id: user.id,
              action: "ASSIGNMENT_FINALIZE",
              resource_type: "assignment",
              resource_id: updated.id,
              assignment_id: updated.id,
              classroom_id: updated.classroomId || null,
              before_state: { status: "closed" },
              after_state: { status: "finalized" },
            })
            .catch(() => {});
        } else if (input.action === "reopen") {
          await this.auditService
            ?.record({
              actor_id: user.id,
              action: "ASSIGNMENT_REOPEN",
              resource_type: "assignment",
              resource_id: updated.id,
              assignment_id: updated.id,
              classroom_id: updated.classroomId || null,
              reason: String(input.reason || ""),
              before_state: { status: "finalized" },
              after_state: { status: "closed" },
            })
            .catch(() => {});
        } else if (input.action === "updateDeadline") {
          await this.auditService
            ?.record({
              actor_id: user.id,
              action: "ASSIGNMENT_PUBLISH",
              resource_type: "assignment",
              resource_id: updated.id,
              assignment_id: updated.id,
              classroom_id: updated.classroomId || null,
              before_state: { deadline: record.assignment.deadline },
              after_state: { deadline: updated.deadline },
            })
            .catch(() => {});
        }
        return visibleAssignment(updated, user.id);
      }
    }
    throw new AppError("มีการเปลี่ยนแปลงข้อมูล กรุณาลองอีกครั้ง", 409);
  }

  private async checkClassroomAccess(
    user: User,
    assignment: Assignment,
  ): Promise<boolean> {
    if (!this.classroomRepository) return false;
    if (assignment.classroomId) {
      const record = await this.classroomRepository.findById(
        assignment.classroomId,
      );
      if (record) {
        const c = record.classroom;
        const isMember =
          c.created_by === user.id ||
          c.members.some(
            (m) =>
              m.user_id === user.id ||
              (user.email &&
                m.email?.toLowerCase() === user.email.toLowerCase()),
          );
        if (isMember) return true;
      }
    }
    const userClassrooms = await this.classroomRepository.listForUser(user.id);
    return userClassrooms.some(
      (c) =>
        c.id === assignment.classroomId ||
        c.assignment_ids?.includes(assignment.id),
    );
  }

  private findForCommand(input: Record<string, unknown>) {
    return input.action === "join"
      ? this.repository.findByCode(String(input.code || ""))
      : this.repository.findById(String(input.id || ""));
  }

  private async create(user: User, input: Record<string, unknown>) {
    const assignment = createAssignment(input, user, this.generateCode());
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (await this.repository.create(assignment)) return assignment;
      assignment.code = this.generateCode();
    }
    throw new AppError("กรุณาลองสร้างใหม่อีกครั้ง", 409);
  }
}
