import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import EvaluateWorkspace from "../../src/pages/evaluate";

vi.mock("next/router", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ className: "mocked-geist-font", variable: "--font-geist-sans" }),
}));

describe("EvaluateWorkspace UI", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the evaluation layout correctly", () => {
    render(<EvaluateWorkspace />);
    expect(screen.getByText("Group Evaluation")).toBeTruthy();
    expect(screen.getByText("User Experience")).toBeTruthy();
    expect(screen.getByText("0 / 2 ✓")).toBeTruthy();
  });

  it("updates progress when a 6-point option is selected", () => {
    render(<EvaluateWorkspace />);
    
    expect(screen.getByText("0 / 2 ✓")).toBeTruthy();
    
    const options = screen.getAllByRole("radio");
    fireEvent.click(options[0]);
    
    expect(screen.getByText("1 / 2 ✓")).toBeTruthy();
    expect(screen.getByText("กำลังบันทึก...")).toBeTruthy();
  });

  it("shows an alert when submitting incomplete", () => {
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<EvaluateWorkspace />);
    
    const submitBtns = screen.getAllByTestId("submit-evaluation");
    fireEvent.click(submitBtns[0]);
    
    expect(alertMock).toHaveBeenCalledWith("คุณตอบไปเพียง 0 จาก 2 ข้อ ยืนยันที่จะ Submit หรือไม่?");
    alertMock.mockRestore();
  });
});
