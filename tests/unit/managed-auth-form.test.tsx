import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signup: vi.fn(), signin: vi.fn(), session: vi.fn(),
  verify: vi.fn(), send: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("#/lib/auth-client", () => ({ authClient: {
  signUp: { email: mocks.signup }, signIn: { email: mocks.signin }, getSession: mocks.session,
  emailOtp: { verifyEmail: mocks.verify, sendVerificationOtp: mocks.send },
} }));
import { ManagedAuthForm } from "#/features/auth/ManagedAuthForm";

beforeEach(() => {
  mocks.signup.mockResolvedValue({ data: {}, error: null });
  mocks.session.mockResolvedValue({ data: { user: { id: "synthetic" } }, error: null });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function fillSignup() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Synthetic user" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "synthetic@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-only-placeholder" } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("managed signup UI", () => {
  it("does not submit when runtime auth is unconfigured", () => {
    render(<ManagedAuthForm register configured={false} />);
    expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();
    expect(mocks.signup).not.toHaveBeenCalled();
  });
  it("uses the SDK and verifies session restoration before navigation", async () => {
    render(<ManagedAuthForm register configured />);
    fillSignup();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/classrooms"));
    expect(mocks.signup).toHaveBeenCalledWith({ name: "Synthetic user", email: "synthetic@example.com", password: "test-only-placeholder" });
    expect(mocks.session).toHaveBeenCalled();
    expect(screen.queryByRole("combobox")).toBeNull();
  });
  it("does not expose upstream errors or navigate after failed signup", async () => {
    mocks.signup.mockResolvedValue({ error: { code: "FAILED", message: "internal detail" } });
    render(<ManagedAuthForm register configured />);
    fillSignup();
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText("internal detail")).toBeNull();
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("offers verification codes when signup has no authenticated session", async () => {
    mocks.session.mockResolvedValue({ data: null, error: null });
    mocks.verify.mockResolvedValue({ error: null });
    render(<ManagedAuthForm register configured />);
    fillSignup();
    await waitFor(() => expect(screen.getByLabelText("Verification code")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify email" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/sign-in"));
    expect(mocks.verify).toHaveBeenCalledWith({ email: "synthetic@example.com", otp: "123456" });
  });
});
