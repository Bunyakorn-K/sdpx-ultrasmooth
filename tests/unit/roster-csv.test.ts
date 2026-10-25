import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseRosterCsv,
  serializeRosterCsv,
} from "@/features/classroom/domain/roster-parser";

test("KMITL CSV template contains 12 distinct students in three groups of four", () => {
  const roster = parseRosterCsv(
    readFileSync("public/templates/student-roster.csv", "utf8"),
  );
  assert.equal(roster.members.length, 12);
  assert.deepEqual(roster.groups, ["Group 1", "Group 2", "Group 3"]);
  roster.members.forEach((member, i) => {
    assert.equal(member.email, `s${i + 1}@kmitl.ac.th`);
    assert.equal(member.student_id, `670150${String(i + 1).padStart(2, "0")}`);
    assert.equal(member.group_name, `Group ${Math.floor(i / 4) + 1}`);
  });
  assert.deepEqual(roster.warnings, []);
});

test("CSV preserves Thai names, commas, quotes, apostrophes and multiline names across HTTP serialization", () => {
  const roster = parseRosterCsv(
    '\uFEFFEMAIL,GROUP_NAME,STUDENT_ID,DISPLAY_NAME\r\ns1@kmitl.ac.th,"กลุ่ม, 1",67015001,"สมชาย ""หนึ่ง""\nใจดี"\r\ns2@kmitl.ac.th,"กลุ่ม, 1",67015002,O\'Brien',
  );
  assert.equal(roster.members[0].display_name, 'สมชาย "หนึ่ง"\nใจดี');
  assert.equal(roster.members[1].display_name, "O'Brien");
  const roundTrip = parseRosterCsv(serializeRosterCsv(roster));
  assert.deepEqual(
    roundTrip.members.map((member) => ({ ...member, rowNumber: 0 })),
    roster.members.map((member) => ({ ...member, rowNumber: 0 })),
  );
});

test("CSV rejects ambiguous columns and malformed quoting instead of silently assigning incorrect groups", () => {
  for (const text of [
    "email,group_name\ns1@kmitl.ac.th,Group 1,extra",
    'email,group_name\ns1@kmitl.ac.th,"Group 1',
    'email,group_name\ns1@kmitl.ac.th,"Group 1"suffix',
    "email,group_name,email\ns1@kmitl.ac.th,Group 1,s2@kmitl.ac.th",
    "email,group_name",
  ])
    assert.throws(() => parseRosterCsv(text));
});

test("CSV reports physical file row numbers after blank and multiline rows", () => {
  assert.throws(
    () =>
      parseRosterCsv(
        'email,group_name,display_name\n\ns1@kmitl.ac.th,Group 1,"ชื่อ\nนามสกุล"\ninvalid,Group 1,Name',
      ),
    /แถวที่ 5/,
  );
  assert.throws(
    () =>
      parseRosterCsv(
        "email,group_name\ns1@kmitl.ac.th,Group 1\n\ns1+tag@kmitl.ac.th,Group 2",
      ),
    /แถวที่ 4.*แถวที่ 2/,
  );
});
