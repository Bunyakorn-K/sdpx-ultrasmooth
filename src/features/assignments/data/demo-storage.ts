import type { Assignment } from "../types";

const STORAGE_KEY = "pair-eval-demo";

export function loadDemoAssignments(): Assignment[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (
      !Array.isArray(parsed) ||
      parsed.some(
        (item) =>
          !item.id || !Array.isArray(item.groups) || !Array.isArray(item.votes),
      )
    )
      return [];
    return parsed as Assignment[];
  } catch {
    return [];
  }
}

export function persistDemoAssignments(assignments: Assignment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}
