import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ current: vi.fn(), create: vi.fn(), list: vi.fn() }));
vi.mock("#/lib/auth", () => ({ getCurrentUser: mocks.current }));
vi.mock("#/services/assignment-service", () => ({ createStandaloneAssignment: mocks.create, listMyAssignments: mocks.list }));
import { GET, POST } from "#/app/api/assignments/route";

const post = (body: unknown) => POST(new Request("http://localhost/api/assignments", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mockResolvedValue({ id: 1, classroomId: 2, joinCode: "pitch-abc12" });
});

describe("POST /api/assignments", () => {
  it("rejects anonymous callers", async () => {
    mocks.current.mockResolvedValue(null);
    expect((await post({ name: "Pitch" })).status).toBe(401);
  });
  it("lets only teachers create assignments", async () => {
    mocks.current.mockResolvedValue({ id: 7, role: "student" });
    expect((await post({ name: "Pitch" })).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("requires a name", async () => {
    mocks.current.mockResolvedValue({ id: 7, role: "teacher" });
    expect((await post({ name: "  " })).status).toBe(400);
  });
  it("creates the assignment for a teacher", async () => {
    mocks.current.mockResolvedValue({ id: 7, role: "teacher" });
    expect((await post({ name: " Pitch ", deadlineUtc: "not a date" })).status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(7, { name: "Pitch", deadlineUtc: null });
  });
});

describe("GET /api/assignments", () => {
  it("shows the join code only on assignments the caller teaches", async () => {
    mocks.current.mockResolvedValue({ id: 7, role: "student" });
    mocks.list.mockResolvedValue([
      { id: 1, role: "INSTRUCTOR", joinCode: "mine" },
      { id: 2, role: "STUDENT", joinCode: "secret" },
    ]);
    const { assignments } = await (await GET()).json();
    expect(assignments).toEqual([{ id: 1, role: "INSTRUCTOR", joinCode: "mine" }, { id: 2, role: "STUDENT" }]);
  });
});
