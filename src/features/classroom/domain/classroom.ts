import { AppError } from "@/shared/domain/app-error";
import type { User } from "@/features/auth/types";
import type {
  Classroom,
  ClassroomMember,
  ClassroomGroup,
  CreateClassroomInput,
} from "../types";
import type { ParseRosterResult } from "./roster-parser";

export function slugify(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `cls-${Date.now().toString(36)}`;
}

export function createClassroom(
  input: CreateClassroomInput,
  user: User,
  customId?: string,
): Classroom {
  if (user.role !== "teacher") {
    throw new AppError("เฉพาะอาจารย์เท่านั้นที่สามารถสร้าง Classroom ได้", 403);
  }

  const name = input.name?.trim();
  if (!name || name.length < 2 || name.length > 200) {
    throw new AppError("ชื่อ Classroom ต้องมีความยาว 2–200 ตัวอักษร");
  }

  const slug = input.slug?.trim() ? slugify(input.slug) : slugify(name);
  const classroomId = customId || crypto.randomUUID();
  const now = new Date().toISOString();

  const ownerMember: ClassroomMember = {
    id: crypto.randomUUID(),
    classroom_id: classroomId,
    user_id: user.id,
    role: "OWNER",
    joined_at: now,
    display_name: user.name,
    email: user.email,
    status: "ACTIVE",
  };

  return {
    id: classroomId,
    name,
    slug,
    timezone: input.timezone?.trim() || "Asia/Bangkok",
    allowed_email_domains: (input.allowed_email_domains || []).map((d) =>
      d.trim().toLowerCase(),
    ),
    status: "ACTIVE",
    created_by: user.id,
    created_at: now,
    members: [ownerMember],
    groups: [],
    assignment_ids: [],
  };
}

export function applyRosterImport(
  classroom: Classroom,
  roster: ParseRosterResult,
): { classroom: Classroom; addedCount: number; updatedCount: number } {
  if (classroom.status === "ARCHIVED") {
    throw new AppError("ไม่สามารถนำเข้ารายชื่อใน Classroom ที่ถูกเก็บถาวรแล้ว", 400);
  }

  const now = new Date().toISOString();
  const nextGroups: ClassroomGroup[] = [...classroom.groups];
  const nextMembers: ClassroomMember[] = [...classroom.members];

  // Helper to find or create group
  function getOrCreateGroupId(groupName: string): string {
    const existing = nextGroups.find((g) => g.name === groupName);
    if (existing) return existing.id;
    const newGroup: ClassroomGroup = {
      id: crypto.randomUUID(),
      classroom_id: classroom.id,
      name: groupName,
      created_at: now,
    };
    nextGroups.push(newGroup);
    return newGroup.id;
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const row of roster.members) {
    const groupId = getOrCreateGroupId(row.group_name);
    const existingMemberIdx = nextMembers.findIndex(
      (m) => m.email.toLowerCase() === row.email.toLowerCase(),
    );

    if (existingMemberIdx >= 0) {
      // Upsert: update group and info (FR-CLASS-05)
      const prev = nextMembers[existingMemberIdx];
      nextMembers[existingMemberIdx] = {
        ...prev,
        group_id: groupId,
        display_name: row.display_name || prev.display_name,
        student_id: row.student_id ?? prev.student_id,
      };
      updatedCount++;
    } else {
      // New member: status PENDING (FR-CLASS-04)
      const newMember: ClassroomMember = {
        id: crypto.randomUUID(),
        classroom_id: classroom.id,
        user_id: crypto.randomUUID(), // provisional user ID until activated on login
        role: "STUDENT",
        group_id: groupId,
        joined_at: now,
        display_name: row.display_name,
        email: row.email,
        student_id: row.student_id,
        status: "PENDING",
      };
      nextMembers.push(newMember);
      addedCount++;
    }
  }

  return {
    classroom: {
      ...classroom,
      groups: nextGroups,
      members: nextMembers,
    },
    addedCount,
    updatedCount,
  };
}

export function addStaffMember(
  classroom: Classroom,
  input: { email: string; name: string; role: "CO_TEACHER" | "TA" },
  requester: User,
): Classroom {
  const requesterMember = classroom.members.find((m) => m.user_id === requester.id);
  if (!requesterMember || (requesterMember.role !== "OWNER" && requesterMember.role !== "CO_TEACHER")) {
    throw new AppError("เฉพาะอาจารย์ผู้รับผิดชอบหรืออาจารย์ร่วมเท่านั้นที่เพิ่มผู้สอนได้", 403);
  }

  const emailNorm = input.email.trim().toLowerCase();
  const existing = classroom.members.find((m) => m.email.toLowerCase() === emailNorm);
  if (existing) {
    throw new AppError(`ผู้ใช้ที่มีอีเมล "${input.email}" เป็นสมาชิกของห้องเรียนนี้อยู่แล้ว`, 409);
  }

  const newStaff: ClassroomMember = {
    id: crypto.randomUUID(),
    classroom_id: classroom.id,
    user_id: crypto.randomUUID(),
    role: input.role,
    joined_at: new Date().toISOString(),
    display_name: input.name.trim() || emailNorm.split("@")[0],
    email: emailNorm,
    status: "PENDING",
  };

  return {
    ...classroom,
    members: [...classroom.members, newStaff],
  };
}

export function removeMember(
  classroom: Classroom,
  memberId: string,
  requester: User,
): Classroom {
  const target = classroom.members.find((m) => m.id === memberId);
  if (!target) {
    throw new AppError("ไม่พบสมาชิกใน Classroom", 404);
  }

  // FR-CLASS-06: Given เหลือ owner คนเดียว, When ลบตัวเอง, Then ปฏิเสธ
  if (target.role === "OWNER") {
    const ownerCount = classroom.members.filter((m) => m.role === "OWNER").length;
    if (ownerCount <= 1) {
      throw new AppError("ไม่สามารถลบเจ้าของห้องเรียนคนสุดท้ายได้ (FR-CLASS-06)", 400);
    }
  }

  const requesterMember = classroom.members.find((m) => m.user_id === requester.id);
  if (!requesterMember || (requesterMember.role !== "OWNER" && requester.id !== target.user_id)) {
    throw new AppError("คุณไม่มีสิทธิ์ลบสมาชิกนี้", 403);
  }

  return {
    ...classroom,
    members: classroom.members.filter((m) => m.id !== memberId),
  };
}

export function archiveClassroom(classroom: Classroom, requester: User): Classroom {
  const requesterMember = classroom.members.find((m) => m.user_id === requester.id);
  if (!requesterMember || requesterMember.role !== "OWNER") {
    throw new AppError("เฉพาะเจ้าของ Classroom เท่านั้นที่สามารถเก็บถาวรได้ (FR-CLASS-07)", 403);
  }

  return {
    ...classroom,
    status: "ARCHIVED",
  };
}
