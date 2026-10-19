import { describe, expect, it, vi } from "vitest";

vi.mock("#/db/client", () => ({ db: {} }));
import { canRate } from "#/services/voting-rules";
import { summarizeRatings } from "#/services/report-service";

describe("canRate", () => {
  const input = { role: "STUDENT", status: "PUBLISHED", deadlineUtc: null, ownGroupId: 1, targetGroupId: 2, score: 4 };
  it("allows a student to score another group while voting is open", () => expect(canRate(input)).toBe(true));
  it("allows a student without a group to score any group", () => expect(canRate({ ...input, ownGroupId: null })).toBe(true));
  it.each([
    { role: "INSTRUCTOR" }, { role: null }, { status: "DRAFT" }, { targetGroupId: 1 },
    { deadlineUtc: new Date(0) }, { score: 0 }, { score: 6 }, { score: 2.5 },
  ])("rejects ineligible scores %#", (patch) => expect(canRate({ ...input, ...patch })).toBe(false));
});

describe("summarizeRatings", () => {
  const groups = [{ id: 1, name: "A" }, { id: 2, name: "B" }];
  const questions = [{ id: 10 }, { id: 11 }];

  it("averages per question and overall, counts distinct voters, and scales to the max score", () => {
    const [a, b] = summarizeRatings(groups, questions, [
      { groupId: 1, questionId: 10, evaluatorUserId: 7, score: 5 },
      { groupId: 1, questionId: 11, evaluatorUserId: 7, score: 3 },
      { groupId: 1, questionId: 10, evaluatorUserId: 8, score: 4 },
    ], 100);
    expect(a.questions).toEqual([
      { questionId: 10, average: 4.5, count: 2 },
      { questionId: 11, average: 3, count: 1 },
    ]);
    expect(a.average).toBe(4);
    expect(a.raterCount).toBe(2);
    expect(a.weightedScore).toBe(80);
    expect(b).toMatchObject({ average: null, raterCount: 0, weightedScore: 0 });
  });
});
