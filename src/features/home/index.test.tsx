import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../../pages/index";

vi.mock("next/head", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ className: "mock-geist" }),
}));

vi.mock("animejs", () => ({
  createScope: () => ({
    add: (callback: () => void) => callback(),
    revert: vi.fn(),
  }),
  animate: vi.fn(),
  stagger: vi.fn(),
}));

describe("homepage", () => {
  beforeEach(() => {
    render(<Home />);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows PairEval homepage students", () => {
    expect(
      screen.getByRole("heading", {
        name: "Fairer student evaluation through pairwise comparison",
      }),
    ).toBeTruthy();
    expect(screen.getByText("University Evaluation System")).toBeTruthy();
  });

  it("provides homepage navigation entry point", () => {
    const navigation = screen.getByRole("navigation");

    expect(navigation.querySelector('a[href="#home"]')?.textContent).toContain(
      "PairEval",
    );
    expect(within(navigation).getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/sign-up");
    expect(within(navigation).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(within(navigation).queryByRole("link", { name: /^(Home|How it works|About)$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
  });
});
