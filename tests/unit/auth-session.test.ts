import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), getAuth: vi.fn(), resolve: vi.fn(), cookies: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("#/lib/neon-auth", () => ({ getAuth: mocks.getAuth }));
vi.mock("#/services/auth-user-service", () => ({ resolveAuthUser: mocks.resolve }));
import { getCurrentUser, normalizeEmail } from "#/lib/auth";

beforeEach(() => {
  vi.stubEnv("ENABLE_DEV_AUTH", "");
  vi.stubEnv("TEACHER_AUTH_IDS", "teacher-subject");
  mocks.getAuth.mockReturnValue({ getSession: mocks.getSession });
  mocks.resolve.mockResolvedValue({ id: 1, emailNormalized: "synthetic@example.com", displayName: "Test" });
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

describe("managed session boundary", () => {
  it("does not trust the old user-id cookie when auth is unconfigured", async () => {
    mocks.getAuth.mockReturnValue(null);
    expect(await getCurrentUser()).toBeNull();
    expect(mocks.cookies).not.toHaveBeenCalled();
  });
  it("rejects missing and errored managed sessions", async () => {
    mocks.getSession.mockResolvedValue({ data: null, error: null });
    expect(await getCurrentUser()).toBeNull();
    mocks.getSession.mockResolvedValue({ data: { user: { id: "teacher-subject" } }, error: { status: 401 } });
    expect(await getCurrentUser()).toBeNull();
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it("resolves teacher access only from the verified session's subject", async () => {
    mocks.getSession.mockResolvedValue({ data: { user: { id: "teacher-subject" } }, error: null });
    expect((await getCurrentUser())?.role).toBe("teacher");
    mocks.getSession.mockResolvedValue({ data: { user: { id: "other-subject", role: "teacher" } }, error: null });
    expect((await getCurrentUser())?.role).toBe("student");
  });
  it("does not activate an imported account that cannot be safely linked", async () => {
    mocks.getSession.mockResolvedValue({ data: { user: { id: "other-subject" } }, error: null });
    mocks.resolve.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
  });
  it("keeps distinct university mailboxes distinct", () => {
    expect(normalizeEmail(" A.B+project@University.edu ")).toBe("a.b+project@university.edu");
    expect(normalizeEmail("ab@university.edu")).not.toBe(normalizeEmail("a.b@university.edu"));
  });
});
