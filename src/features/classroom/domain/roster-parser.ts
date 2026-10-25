import { AppError } from "@/shared/domain/app-error";

export type ParsedRosterMember = {
  email: string;
  group_name: string;
  student_id?: string;
  display_name: string;
  rowNumber: number;
};

export type ParseRosterResult = {
  members: ParsedRosterMember[];
  groups: string[];
  warnings: string[];
};

/** CSV records retain physical line numbers, including quoted multiline fields. */
function csvRecords(text: string): { cols: string[]; rowNumber: number }[] {
  const records: { cols: string[]; rowNumber: number }[] = [];
  let cols: string[] = [];
  let cell = "";
  let quoted = false;
  let closed = false;
  let line = 1;
  let rowNumber = 1;
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i <= source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === undefined)
        throw new AppError(
          `แถวที่ ${rowNumber}: เครื่องหมายคำพูดใน CSV ไม่ครบ`,
        );
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else {
        cell += char;
        if (char === "\n") line++;
      }
    } else if (char === "," || char === "\n" || char === undefined) {
      cols.push(cell.trim());
      cell = "";
      closed = false;
      if (char !== ",") {
        if (cols.some(Boolean)) records.push({ cols, rowNumber });
        cols = [];
        line++;
        rowNumber = line;
      }
    } else if (char === '"' && !cell.trim() && !closed) {
      cell = "";
      quoted = true;
    } else {
      if (char === '"' || (closed && char.trim()))
        throw new AppError(
          `แถวที่ ${rowNumber}: รูปแบบเครื่องหมายคำพูดใน CSV ไม่ถูกต้อง`,
        );
      cell += char;
    }
  }
  return records;
}

export function serializeRosterCsv(roster: ParseRosterResult): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return (
    "email,group_name,student_id,display_name\r\n" +
    roster.members
      .map((m) =>
        [m.email, m.group_name, m.student_id || "", m.display_name]
          .map(escape)
          .join(","),
      )
      .join("\r\n")
  );
}

export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.indexOf("@");
  if (atIndex === -1) return trimmed;

  let local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);

  // If gmail, remove dots and strip +tag
  if (domain === "@gmail.com" || domain === "@googlemail.com") {
    local = local.replace(/\./g, "");
  }
  // Strip +tag
  const plusIndex = local.indexOf("+");
  if (plusIndex !== -1) {
    local = local.slice(0, plusIndex);
  }

  return `${local}${domain}`;
}

export function parseRosterCsv(csvText: string): ParseRosterResult {
  const lines = csvRecords(csvText);

  if (lines.length === 0) {
    throw new AppError("ไฟล์ CSV ว่างเปล่า");
  }

  // Header line
  const headerCols = lines[0].cols.map((c) => c.toLowerCase());
  if (new Set(headerCols).size !== headerCols.length)
    throw new AppError("หัวตาราง CSV มีคอลัมน์ซ้ำ");

  const emailIdx = headerCols.indexOf("email");
  const groupIdx = headerCols.indexOf("group_name");
  const studentIdIdx = headerCols.indexOf("student_id");
  const nameIdx = headerCols.indexOf("display_name");

  if (emailIdx === -1 || groupIdx === -1) {
    throw new AppError("หัวตาราง CSV ต้องมีคอลัมน์ email และ group_name");
  }
  if (lines.length === 1)
    throw new AppError("ไฟล์ CSV ต้องมีรายชื่อนักศึกษาอย่างน้อย 1 คน");

  const members: ParsedRosterMember[] = [];
  const seenEmails = new Map<string, number>();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // FR-CLASS-02: Atomic validation. If any row is invalid, reject whole file and report exact row!
  for (let i = 1; i < lines.length; i++) {
    const { rowNumber, cols } = lines[i];
    if (cols.length !== headerCols.length)
      throw new AppError(
        `แถวที่ ${rowNumber}: จำนวนคอลัมน์ไม่ตรงกับหัวตาราง CSV`,
      );

    const rawEmail = cols[emailIdx] || "";
    const groupName = cols[groupIdx] || "";
    const studentId = studentIdIdx !== -1 ? cols[studentIdIdx] : undefined;
    const displayName =
      nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : rawEmail.split("@")[0];

    if (!groupName) {
      throw new AppError(`แถวที่ ${rowNumber}: group_name ต้องไม่เป็นค่าว่าง`);
    }

    if (!rawEmail || !emailRegex.test(rawEmail)) {
      throw new AppError(
        `แถวที่ ${rowNumber}: รูปแบบอีเมล "${rawEmail}" ไม่ถูกต้อง`,
      );
    }

    const normalized = normalizeEmail(rawEmail);
    if (seenEmails.has(normalized)) {
      const prevRow = seenEmails.get(normalized);
      throw new AppError(
        `แถวที่ ${rowNumber}: อีเมล "${rawEmail}" ซ้ำกับแถวที่ ${prevRow}`,
      );
    }
    seenEmails.set(normalized, rowNumber);

    members.push({
      email: normalized,
      group_name: groupName,
      student_id: studentId || undefined,
      display_name: displayName,
      rowNumber,
    });
  }

  // Count members per group (FR-CLASS-03 warning / validation)
  const groupCounts = new Map<string, number>();
  for (const m of members) {
    groupCounts.set(m.group_name, (groupCounts.get(m.group_name) || 0) + 1);
  }

  const warnings: string[] = [];
  for (const [group, count] of groupCounts.entries()) {
    if (count < 2) {
      warnings.push(
        `กลุ่ม "${group}" มีสมาชิกเพียง ${count} คน (น้อยกว่า 2 คน)`,
      );
    }
  }

  const uniqueGroups = Array.from(groupCounts.keys());

  return {
    members,
    groups: uniqueGroups,
    warnings,
  };
}
