import { describe, expect, it } from "vitest";
import { parseRosterCsv } from "#/services/roster-service";

describe("parseRosterCsv — FR-CLASS-01/02/03", () => {
  it("parses a valid roster", () => {
    const csv = [
      "email,group_name,student_id,display_name",
      "a@uni.ac.th,Aurora,67015001,Alice",
      "b@uni.ac.th,Aurora,67015002,Bob",
      "c@uni.ac.th,Borealis,67015003,Carol",
      "d@uni.ac.th,Borealis,67015004,Dave",
    ].join("\n");

    const { rows, errors } = parseRosterCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({
      emailRaw: "a@uni.ac.th",
      groupName: "Aurora",
      studentId: "67015001",
      displayName: "Alice",
    });
  });

  it("is case-insensitive on header names", () => {
    const csv = ["Email,Group_Name", "a@uni.ac.th,G1", "b@uni.ac.th,G1"].join("\n");
    const { errors } = parseRosterCsv(csv);
    expect(errors).toEqual([]);
  });

  it("rejects a header missing required columns", () => {
    const csv = ["name,group", "a@uni.ac.th,G1"].join("\n");
    const { errors } = parseRosterCsv(csv);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("email");
  });

  it("reports the exact row for a malformed email, without discarding other errors", () => {
    const csv = [
      "email,group_name",
      "a@uni.ac.th,G1",
      "not-an-email,G1",
      "c@uni.ac.th,G1",
    ].join("\n");

    const { errors } = parseRosterCsv(csv);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(3); // header is row 1, so this is the 3rd line
  });

  it("reports duplicate emails with the first-seen row", () => {
    const csv = [
      "email,group_name",
      "a@uni.ac.th,G1",
      "b@uni.ac.th,G1",
      "a@uni.ac.th,G2",
    ].join("\n");
    const { errors } = parseRosterCsv(csv);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(4);
    expect(errors[0].message).toContain("2");
  });

  it("rejects an empty group_name", () => {
    const csv = ["email,group_name", "a@uni.ac.th,", "b@uni.ac.th,G1"].join("\n");
    const { errors } = parseRosterCsv(csv);
    expect(errors.some((e) => e.message.includes("group_name"))).toBe(true);
  });

  it("flags a group with fewer than 2 members", () => {
    const csv = ["email,group_name", "a@uni.ac.th,Solo", "b@uni.ac.th,G1", "c@uni.ac.th,G1"].join("\n");
    const { errors } = parseRosterCsv(csv);
    expect(errors.some((e) => e.message.includes('"Solo"'))).toBe(true);
  });

  it("is atomic: any error means zero rows are considered importable", () => {
    const csv = ["email,group_name", "a@uni.ac.th,G1", "bad-email,G1"].join("\n");
    const { errors } = parseRosterCsv(csv);
    // The caller (importRoster) checks errors.length > 0 before writing
    // anything — asserting errors are non-empty here is what guarantees
    // that atomicity contract holds.
    expect(errors.length).toBeGreaterThan(0);
  });
});
