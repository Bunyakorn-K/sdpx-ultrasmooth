import { describe, expect, it } from "vitest";
import { votingReadiness } from "#/services/voting-readiness";

describe("votingReadiness", () => {
  it("is ready with at least one question and two groups", () => {
    expect(votingReadiness({ questionCount: 1, groupCount: 2 })).toMatchObject({ ready: true });
  });

  it("names every missing requirement", () => {
    const result = votingReadiness({ questionCount: 0, groupCount: 1 });
    expect(result.ready).toBe(false);
    expect(result.message).toContain("question");
    expect(result.message).toContain("2 groups");
  });

  it("blocks a single group even with questions", () => {
    expect(votingReadiness({ questionCount: 3, groupCount: 1 }).ready).toBe(false);
  });
});
