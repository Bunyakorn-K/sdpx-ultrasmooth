import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEmail,
  parseRosterCsv,
} from "@/features/classroom/domain/roster-parser";

test("FR-AUTH-03: normalizeEmail removes dots and +tags across domains and lowercases", () => {
  assert.equal(
    normalizeEmail("Somchai.A+test@gmail.com"),
    "somchaia@gmail.com",
  );
  assert.equal(normalizeEmail("Somchai.A+x@uni.ac.th"), "somchaia@uni.ac.th");
  assert.equal(normalizeEmail("somchaia@uni.ac.th"), "somchaia@uni.ac.th");
  assert.equal(normalizeEmail("STUDENT@uni.ac.th"), "student@uni.ac.th");
});

test("FR-CLASS-01: parses valid CSV with mixed case headers", () => {
  const csv = `EMAIL,Group_Name,Student_ID,Display_Name
alice@example.com,Aurora,66010001,Alice Smith
bob@example.com,Aurora,66010002,Bob Jones
charlie@example.com,Borealis,66010003,Charlie Brown
david@example.com,Borealis,66010004,David Wilson`;

  const result = parseRosterCsv(csv);
  assert.equal(result.members.length, 4);
  assert.deepEqual(result.groups, ["Aurora", "Borealis"]);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.members[0].display_name, "Alice Smith");
  assert.equal(result.members[0].group_name, "Aurora");
});

test("FR-CLASS-02: atomic rejection with exact row number on invalid email", () => {
  const csv = `email,group_name,student_id,display_name
alice@example.com,Aurora,66010001,Alice
invalid-email-here,Aurora,66010002,Bob
charlie@example.com,Borealis,66010003,Charlie`;

  assert.throws(
    () => parseRosterCsv(csv),
    (err: unknown) => {
      const error = err as Error;
      assert.match(
        error.message,
        /แถวที่ 3: รูปแบบอีเมล "invalid-email-here" ไม่ถูกต้อง/,
      );
      return true;
    },
  );
});

test("FR-CLASS-03: rejects duplicate email within file and specifies rows", () => {
  const csv = `email,group_name
alice@example.com,GroupA
bob@example.com,GroupA
alice@example.com,GroupB`;

  assert.throws(
    () => parseRosterCsv(csv),
    (err: unknown) => {
      const error = err as Error;
      assert.match(
        error.message,
        /แถวที่ 4: อีเมล "alice@example.com" ซ้ำกับแถวที่ 2/,
      );
      return true;
    },
  );
});

test("FR-CLASS-03: rejects empty group_name with exact row", () => {
  const csv = `email,group_name
alice@example.com,
bob@example.com,GroupA`;

  assert.throws(
    () => parseRosterCsv(csv),
    (err: unknown) => {
      const error = err as Error;
      assert.match(error.message, /แถวที่ 2: group_name ต้องไม่เป็นค่าว่าง/);
      return true;
    },
  );
});

test("FR-CLASS-03: warns when group has fewer than 2 members", () => {
  const csv = `email,group_name
alice@example.com,GroupA
bob@example.com,GroupB
charlie@example.com,GroupB`;

  const result = parseRosterCsv(csv);
  assert.equal(result.members.length, 3);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /กลุ่ม "GroupA" มีสมาชิกเพียง 1 คน/);
});
