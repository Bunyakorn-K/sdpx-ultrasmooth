import type { User } from "@/features/auth/types";
import type { AuditService } from "@/features/audit/server/audit-service";
import { AppError } from "@/shared/domain/app-error";
import {
  createClassroom,
  applyRosterImport,
  addStaffMember,
  removeMember,
  archiveClassroom,
} from "../domain/classroom";
import { parseRosterCsv } from "../domain/roster-parser";
import type { Classroom, ClassroomMember, CreateClassroomInput } from "../types";
import type { ClassroomRepository } from "./classroom-repository";

const MAX_RETRIES = 5;

export class ClassroomService {
  constructor(
    private readonly repository: ClassroomRepository,
    private readonly auditService?: AuditService,
  ) {}

  async list(user: User): Promise<Classroom[]> {
    return this.repository.listForUser(user.id);
  }

  async get(user: User, id: string): Promise<Classroom> {
    const record = await this.repository.findById(id);
    if (!record) throw new AppError("ไม่พบห้องเรียน", 404);
    const classroom = record.classroom;

    const isMember = classroom.members.some(
      (m) => m.user_id === user.id || m.email.toLowerCase() === user.email.toLowerCase(),
    );
    if (classroom.created_by !== user.id && !isMember) {
      throw new AppError("คุณไม่มีสิทธิ์เข้าถึงห้องเรียนนี้", 403);
    }

    return classroom;
  }

  async create(user: User, input: CreateClassroomInput): Promise<Classroom> {
    const classroom = createClassroom(input, user);
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (await this.repository.create(classroom)) return classroom;
      classroom.slug = `${classroom.slug}-${Math.floor(Math.random() * 1000)}`;
    }
    throw new AppError("ไม่สามารถสร้างห้องเรียนได้ กรุณาลองใหม่อีกครั้ง", 409);
  }

  async importRoster(
    user: User,
    id: string,
    csvText: string,
  ): Promise<{ classroom: Classroom; addedCount: number; updatedCount: number }> {
    const roster = parseRosterCsv(csvText); // Throws AppError on atomic validation failure (FR-CLASS-02)

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const record = await this.repository.findById(id);
      if (!record) throw new AppError("ไม่พบห้องเรียน", 404);

      const requesterMember = record.classroom.members.find((m) => m.user_id === user.id);
      if (
        record.classroom.created_by !== user.id &&
        (!requesterMember || (requesterMember.role !== "OWNER" && requesterMember.role !== "CO_TEACHER"))
      ) {
        throw new AppError("เฉพาะอาจารย์ผู้รับผิดชอบเท่านั้นที่สามารถนำเข้ารายชื่อได้", 403);
      }

      const result = applyRosterImport(record.classroom, roster);
      if (await this.repository.update(result.classroom, record.version)) {
        return result;
      }
    }
    throw new AppError("มีการเปลี่ยนแปลงข้อมูล กรุณาลองอีกครั้ง", 409);
  }

  async addStaff(
    user: User,
    id: string,
    input: { email: string; name: string; role: "CO_TEACHER" | "TA" },
  ): Promise<Classroom> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const record = await this.repository.findById(id);
      if (!record) throw new AppError("ไม่พบห้องเรียน", 404);

      const updated = addStaffMember(record.classroom, input, user);
      if (await this.repository.update(updated, record.version)) {
        await this.auditService?.record({
          actor_id: user.id,
          action: "ROLE_CHANGE",
          resource_type: "classroom_member",
          resource_id: updated.members[updated.members.length - 1].id,
          classroom_id: updated.id,
          after_state: { email: input.email, role: input.role },
        }).catch(() => {});
        return updated;
      }
    }
    throw new AppError("มีการเปลี่ยนแปลงข้อมูล กรุณาลองอีกครั้ง", 409);
  }

  async removeMember(user: User, id: string, memberId: string): Promise<Classroom> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const record = await this.repository.findById(id);
      if (!record) throw new AppError("ไม่พบห้องเรียน", 404);

      const updated = removeMember(record.classroom, memberId, user);
      if (await this.repository.update(updated, record.version)) {
        await this.auditService?.record({
          actor_id: user.id,
          action: "ROLE_CHANGE",
          resource_type: "classroom_member",
          resource_id: memberId,
          classroom_id: updated.id,
          before_state: { memberId },
        }).catch(() => {});
        return updated;
      }
    }
    throw new AppError("มีการเปลี่ยนแปลงข้อมูล กรุณาลองอีกครั้ง", 409);
  }

  async archive(user: User, id: string): Promise<Classroom> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const record = await this.repository.findById(id);
      if (!record) throw new AppError("ไม่พบห้องเรียน", 404);

      const updated = archiveClassroom(record.classroom, user);
      if (await this.repository.update(updated, record.version)) {
        return updated;
      }
    }
    throw new AppError("มีการเปลี่ยนแปลงข้อมูล กรุณาลองอีกครั้ง", 409);
  }

  async join(user: User, code: string): Promise<Classroom> {
    const trimmed = code.trim();
    if (!trimmed) throw new AppError("กรุณากรอกรหัสเข้าร่วมห้องเรียน", 400);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const record =
        (await this.repository.findBySlug(trimmed.toLowerCase())) ||
        (await this.repository.findBySlug(trimmed)) ||
        (await this.repository.findById(trimmed));

      if (!record) throw new AppError("ไม่พบห้องเรียนจากรหัสที่ระบุ", 404);
      const classroom = record.classroom;

      if (classroom.status === "ARCHIVED") {
        throw new AppError("ห้องเรียนนี้ถูกเก็บถาวรแล้ว ไม่สามารถเข้าร่วมได้", 400);
      }

      if (classroom.allowed_email_domains && classroom.allowed_email_domains.length > 0) {
        const userDomain = user.email.split("@")[1]?.toLowerCase();
        const allowed = classroom.allowed_email_domains.some(
          (d) => d.toLowerCase() === userDomain,
        );
        if (!allowed) {
          throw new AppError("อีเมลของคุณไม่อยู่ในโดเมนที่ได้รับอนุญาตสำหรับห้องเรียนนี้", 403);
        }
      }

      const isMember = classroom.members.some(
        (m) =>
          m.user_id === user.id ||
          m.email.toLowerCase() === user.email.toLowerCase(),
      );
      if (isMember) {
        return classroom;
      }

      const newMember: ClassroomMember = {
        id: crypto.randomUUID(),
        classroom_id: classroom.id,
        user_id: user.id,
        role: "STUDENT",
        joined_at: new Date().toISOString(),
        display_name: user.name,
        email: user.email,
        status: "ACTIVE",
      };

      const updatedClassroom: Classroom = {
        ...classroom,
        members: [...classroom.members, newMember],
      };

      if (await this.repository.update(updatedClassroom, record.version)) {
        return updatedClassroom;
      }
    }
    throw new AppError("มีการเปลี่ยนแปลงข้อมูล กรุณาลองใหม่อีกครั้ง", 409);
  }

  async linkAssignment(
    user: User,
    classroomId: string,
    assignmentId: string,
  ): Promise<Classroom> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const record = await this.repository.findById(classroomId);
      if (!record) throw new AppError("ไม่พบห้องเรียน", 404);

      const isOwnerOrStaff =
        record.classroom.created_by === user.id ||
        record.classroom.members.some(
          (m) =>
            m.user_id === user.id &&
            (m.role === "OWNER" || m.role === "CO_TEACHER"),
        );
      if (!isOwnerOrStaff) {
        throw new AppError(
          "เฉพาะผู้สอนเท่านั้นที่สามารถจัดการ Assignment ในห้องเรียนได้",
          403,
        );
      }

      const currentIds = record.classroom.assignment_ids || [];
      if (currentIds.includes(assignmentId)) {
        return record.classroom;
      }

      const updated: Classroom = {
        ...record.classroom,
        assignment_ids: [...currentIds, assignmentId],
      };

      if (await this.repository.update(updated, record.version)) {
        return updated;
      }
    }
    throw new AppError("มีการเปลี่ยนแปลงข้อมูล กรุณาลองใหม่อีกครั้ง", 409);
  }
}
