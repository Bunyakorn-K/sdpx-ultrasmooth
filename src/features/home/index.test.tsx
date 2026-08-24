import { cleanup, render, screen } from "@testing-library/react";
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
    expect(
      navigation.querySelector('a[href="#how-it-works"]')?.textContent,
    ).toContain("How it works");
    expect(navigation.querySelector('a[href="#about"]')?.textContent).toContain(
      "About",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
  });
});
