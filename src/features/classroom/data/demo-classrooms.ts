import type { Classroom } from "../types";

export const initialDemoClassrooms: Classroom[] = [];

const CLASSROOMS_STORAGE_KEY = "peerly-demo-classrooms";

export function loadDemoClassrooms(): Classroom[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CLASSROOMS_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed as Classroom[];
  } catch {
    return [];
  }
}

export function persistDemoClassrooms(classrooms: Classroom[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(classrooms));
  } catch {
    // ignore
  }
}
