import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ current: vi.fn(), role: vi.fn(), assignment: vi.fn(), scores: vi.fn(), report: vi.fn() }));
vi.mock("#/lib/auth", () => ({ getCurrentUser: mocks.current, getClassroomRole: mocks.role }));
vi.mock("#/services/assignment-service", () => ({ getAssignment: mocks.assignment }));
vi.mock("#/services/report-service", () => ({ getGroupScores: mocks.scores, getStudentReport: mocks.report }));
import { GET as scores } from "#/app/api/assignments/[assignmentId]/scores/route";
import { GET as report } from "#/app/api/assignments/[assignmentId]/my-report/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.current.mockResolvedValue({ id: 7, role: "student" });
  mocks.assignment.mockResolvedValue({ id: 3, classroomId: 2 });
  mocks.scores.mockResolvedValue({ rows: [] });
  mocks.report.mockResolvedValue({ participation: {} });
});

describe.each([["scores", scores], ["legacy report", report]] as const)("%s authorization", (_name, handler) => {
  const context = () => ({ params: Promise.resolve({ assignmentId: "3" }) });
  it("rejects direct anonymous requests", async () => {
    mocks.current.mockResolvedValue(null);
    expect((await handler(new Request("http://localhost"), context())).status).toBe(401);
  });
  it.each(["STUDENT", null])("does not expose results to %s", async (role) => {
    mocks.role.mockResolvedValue(role);
    expect((await handler(new Request("http://localhost"), context())).status).toBe(404);
    expect(mocks.scores).not.toHaveBeenCalled();
    expect(mocks.report).not.toHaveBeenCalled();
  });
  it("allows only a teacher in the assignment classroom", async () => {
    mocks.role.mockResolvedValue("INSTRUCTOR");
    expect((await handler(new Request("http://localhost"), context())).status).toBe(200);
  });
});
