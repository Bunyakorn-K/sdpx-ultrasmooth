import { and, eq } from "drizzle-orm";

import { db } from "#/db/client";
import { classroomMembers, groupEntities } from "#/db/schema";
import { normalizeEmail } from "#/lib/auth";
import { parseCsv } from "#/lib/csv";
import { findOrCreateUser } from "#/services/user-service";

export interface RosterRow {
  emailRaw: string;
  groupName: string;
  studentId?: string;
  displayName?: string;
}

export interface RosterImportError {
  row: number; // 1-indexed; header is row 1, matching FR-CLASS-02's "row 42" example. 0 = file-level.
  message: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * FR-CLASS-01/02/03: parses and validates the roster CSV without writing
 * anything. Called on its own by the import route to build the atomic
 * "reject the whole file, report every bad row" response.
 */
export function parseRosterCsv(text: string): { rows: RosterRow[]; errors: RosterImportError[] } {
  const table = parseCsv(text);
  const errors: RosterImportError[] = [];

  if (table.length === 0) {
    return { rows: [], errors: [{ row: 1, message: "ไฟล์ CSV ว่างเปล่า" }] };
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const emailIdx = header.indexOf("email");
  const groupIdx = header.indexOf("group_name");
  const studentIdIdx = header.indexOf("student_id");
  const displayNameIdx = header.indexOf("display_name");

  if (emailIdx === -1 || groupIdx === -1) {
    return { rows: [], errors: [{ row: 1, message: "หัวตารางต้องมีคอลัมน์ email และ group_name" }] };
  }

  const rows: RosterRow[] = [];
  const firstRowByEmail = new Map<string, number>();

  for (let i = 1; i < table.length; i++) {
    const rowNumber = i + 1;
    const cells = table[i];
    const emailRaw = (cells[emailIdx] ?? "").trim();
    const groupName = (cells[groupIdx] ?? "").trim();
    const studentId = studentIdIdx >= 0 ? (cells[studentIdIdx] ?? "").trim() || undefined : undefined;
    const displayName = displayNameIdx >= 0 ? (cells[displayNameIdx] ?? "").trim() || undefined : undefined;

    if (!emailRaw) {
      errors.push({ row: rowNumber, message: "อีเมลว่างเปล่า" });
      continue;
    }
    if (!EMAIL_REGEX.test(emailRaw)) {
      errors.push({ row: rowNumber, message: `รูปแบบอีเมลไม่ถูกต้อง: ${emailRaw}` });
      continue;
    }
    if (!groupName) {
      errors.push({ row: rowNumber, message: "group_name ว่างเปล่า" });
      continue;
    }

    const normalized = normalizeEmail(emailRaw);
    const firstSeenRow = firstRowByEmail.get(normalized);
    if (firstSeenRow !== undefined) {
      errors.push({ row: rowNumber, message: `อีเมลซ้ำกับแถว ${firstSeenRow}: ${emailRaw}` });
      continue;
    }
    firstRowByEmail.set(normalized, rowNumber);

    rows.push({ emailRaw, groupName, studentId, displayName });
  }

  const countByGroup = new Map<string, number>();
  for (const row of rows) {
    countByGroup.set(row.groupName, (countByGroup.get(row.groupName) ?? 0) + 1);
  }
  for (const [groupName, memberCount] of countByGroup) {
    if (memberCount < 2) {
      errors.push({
        row: 0,
        message: `กลุ่ม "${groupName}" มีสมาชิกเพียง ${memberCount} คน (ต้องมีอย่างน้อย 2 คน)`,
      });
    }
  }

  return { rows, errors };
}

export interface RosterImportResult {
  importedCount: number;
  groups: string[];
  errors: RosterImportError[];
}

/**
 * FR-CLASS-02: atomic — either every valid row is written, or (on any
 * validation error) nothing is written at all.
 */
export async function importRoster(classroomId: number, csvText: string): Promise<RosterImportResult> {
  const { rows, errors } = parseRosterCsv(csvText);
  if (errors.length > 0) {
    return { importedCount: 0, groups: [], errors };
  }

  const groupNames = [...new Set(rows.map((r) => r.groupName))];

  return db.transaction(async (tx) => {
    const groupIdByName = new Map<string, number>();
    for (const name of groupNames) {
      const [existing] = await tx
        .select()
        .from(groupEntities)
        .where(and(eq(groupEntities.classroomId, classroomId), eq(groupEntities.name, name)));

      if (existing) {
        groupIdByName.set(name, existing.id);
      } else {
        const [created] = await tx.insert(groupEntities).values({ classroomId, name }).returning();
        groupIdByName.set(name, created.id);
      }
    }

    for (const row of rows) {
      const user = await findOrCreateUser(row.emailRaw, row.displayName ?? null, tx);
      const groupId = groupIdByName.get(row.groupName)!;

      await tx
        .insert(classroomMembers)
        .values({ classroomId, userId: user.id, role: "STUDENT", groupId })
        .onConflictDoUpdate({
          target: [classroomMembers.classroomId, classroomMembers.userId],
          set: { groupId, role: "STUDENT" },
        });
    }

    return { importedCount: rows.length, groups: groupNames, errors: [] };
  });
}
