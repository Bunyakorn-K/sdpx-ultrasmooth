import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ current: vi.fn(), role: vi.fn(), assignment: vi.fn(), end: vi.fn() }));
vi.mock("#/db/client", () => ({ db: {} }));
vi.mock("#/lib/auth", () => ({ getCurrentUser: mocks.current, getClassroomRole: mocks.role }));
vi.mock("#/services/assignment-service", () => ({ getAssignment: mocks.assignment, endVoting: mocks.end }));
import { votingState } from "#/services/voting-rules";
import { summarizeProgress } from "#/services/report-service";
import { POST as close } from "#/app/api/assignments/[assignmentId]/close/route";

describe("votingState", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("is SETUP before voting starts", () => expect(votingState({ status: "DRAFT", deadlineUtc: null }, now)).toBe("SETUP"));
  it("is OPEN while voting runs without a deadline", () => expect(votingState({ status: "PUBLISHED", deadlineUtc: null }, now)).toBe("OPEN"));
  it("is OPEN before the deadline", () => expect(votingState({ status: "PUBLISHED", deadlineUtc: new Date("2026-01-02") }, now)).toBe("OPEN"));
  it("is CLOSED once the deadline passes or voting was ended", () =>
    expect(votingState({ status: "PUBLISHED", deadlineUtc: now }, now)).toBe("CLOSED"));
});

describe("summarizeProgress", () => {
  const students = [{ userId: 1, name: "Bea" }, { userId: 2, name: "Ann" }, { userId: 3, name: "Cid" }];
  const progress = summarizeProgress(students, new Map([[1, 10], [2, 11]]), 3, 2, new Map([[1, 4], [2, 1]]));
  it("expects every question for every group except the student's own", () =>
    expect(progress.map((row) => [row.userId, row.expected])).toEqual([[2, 4], [3, 6], [1, 4]]));
  it("lists unfinished students first, then by name", () =>
    expect(progress.map((row) => row.name)).toEqual(["Ann", "Cid", "Bea"]));
  it("counts zero scores for students who have not voted", () => expect(progress[1].given).toBe(0));
});

describe("POST /close (End voting)", () => {
  const context = () => ({ params: Promise.resolve({ assignmentId: "3" }) });
  const request = () => new Request("http://localhost", { method: "POST" });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.current.mockResolvedValue({ id: 7, role: "teacher" });
    mocks.role.mockResolvedValue("INSTRUCTOR");
    mocks.assignment.mockResolvedValue({ id: 3, classroomId: 2 });
    mocks.end.mockResolvedValue(true);
  });
  it("rejects anonymous requests", async () => {
    mocks.current.mockResolvedValue(null);
    expect((await close(request(), context())).status).toBe(401);
  });
  it.each([
    [{ id: 7, role: "student" }, "STUDENT"], [{ id: 7, role: "teacher" }, null], [{ id: 7, role: "student" }, "INSTRUCTOR"],
  ])("hides the assignment from non-owners %#", async (user, role) => {
    mocks.current.mockResolvedValue(user);
    mocks.role.mockResolvedValue(role);
    expect((await close(request(), context())).status).toBe(404);
    expect(mocks.end).not.toHaveBeenCalled();
  });
  it("lets the teacher end open voting", async () => {
    expect((await close(request(), context())).status).toBe(204);
    expect(mocks.end).toHaveBeenCalledWith(3);
  });
  it("reports a conflict when voting is not open", async () => {
    mocks.end.mockResolvedValue(false);
    expect((await close(request(), context())).status).toBe(409);
  });
});
