import type { Assignment } from "../types";
import { targetVotes } from "./evaluation-targets";
export function average(a: Assignment, targetId: string) {
  const scores = targetVotes(a, targetId).flatMap((vote) => vote.scores);
  return scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : 0;
}
