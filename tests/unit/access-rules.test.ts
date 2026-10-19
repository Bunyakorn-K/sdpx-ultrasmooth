import { afterEach, describe, expect, it, vi } from "vitest";
import { accountRole, devAuthEnabled } from "#/lib/auth-policy";
import { GroupRuleError, parseGroupInput, requireOpenEnrollment } from "#/services/group-rules";
import { canVote } from "#/services/voting-rules";

afterEach(() => vi.unstubAllEnvs());

describe("teacher/student account policy", () => {
  it("defaults new users to student and requires an exact server-side subject allowlist", () => {
    expect(accountRole("user-1", "user-10, user-2")).toBe("student");
    expect(accountRole("user-1", " user-1, user-2 ")).toBe("teacher");
    expect(accountRole("", "")).toBe("student");
  });
  it("never enables the legacy identity cookie in production", () => {
    vi.stubEnv("ENABLE_DEV_AUTH", "1");
    vi.stubEnv("NODE_ENV", "production");
    expect(devAuthEnabled()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(devAuthEnabled()).toBe(true);
    vi.stubEnv("ENABLE_DEV_AUTH", "");
    expect(devAuthEnabled()).toBe(false);
  });
});

describe("assignment enrollment rules", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("accepts enrollment only before voting and the deadline", () => {
    expect(() => requireOpenEnrollment({ status: "DRAFT", deadlineUtc: null }, now)).not.toThrow();
    expect(() => requireOpenEnrollment({ status: "PUBLISHED", deadlineUtc: null }, now)).toThrow(GroupRuleError);
    expect(() => requireOpenEnrollment({ status: "DRAFT", deadlineUtc: now }, now)).toThrow(GroupRuleError);
  });
  it("normalizes a valid group answer", () => {
    expect(parseGroupInput({ name: " Team A ", description: " Answer ", artifactUrl: "https://example.com/work" }))
      .toEqual({ name: "Team A", description: "Answer", artifactUrl: "https://example.com/work" });
  });
  it.each([null, {}, { name: " " }, { name: "a".repeat(101) },
    { name: "A", artifactUrl: "javascript:alert(1)" }, { name: "A", artifactUrl: "http://example.com" },
    { name: "A", description: "a".repeat(4001) }])("rejects invalid group input %#", (input) => {
    expect(() => parseGroupInput(input)).toThrow(GroupRuleError);
  });
});

describe("voting eligibility", () => {
  const input = { role: "STUDENT", status: "PUBLISHED", deadlineUtc: null,
    evaluatorUserId: 5, userId: 5, groupId: 3, itemAId: 1, itemBId: 2 };
  it("allows an assigned student to compare other groups", () => expect(canVote(input)).toBe(true));
  it.each([
    { role: "INSTRUCTOR" }, { role: null }, { status: "DRAFT" },
    { userId: 6 }, { groupId: null }, { groupId: 1 }, { groupId: 2 },
    { deadlineUtc: new Date(0) },
  ])("rejects ineligible votes %#", (patch) => expect(canVote({ ...input, ...patch })).toBe(false));
});
