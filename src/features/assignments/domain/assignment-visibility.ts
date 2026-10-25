import type { Assignment } from "../types";
import { generatedResult } from "@/features/pairwise/domain/generated-results";
export function visibleAssignment(
  assignment: Assignment,
  userId: string,
): Assignment {
  if (assignment.ownerId === userId) return assignment;
  const votes =
    assignment.status === "closed" || assignment.status === "finalized"
      ? assignment.votes.map((vote) => ({
          ...vote,
          userId: vote.userId === userId ? userId : "anonymous",
        }))
      : assignment.votes.filter((vote) => vote.userId === userId);
  const visible = { ...assignment, votes };
  // Finalization snapshots contain raw ballots and must remain owner-only.
  delete visible.finalizedSnapshot;
  delete visible.pairingReason;
  delete visible.pairingShape;
  delete visible.pairingSnapshot;
  if (assignment.pairs) {
    if (assignment.status === "closed" || assignment.status === "finalized")
      visible.pairResult = generatedResult(assignment, userId);
    visible.pairs = assignment.pairs.filter(
      (p) => p.evaluator_user_id === userId,
    );
    visible.comparisons = assignment.comparisons?.filter(
      (c) => c.evaluator_user_id === userId,
    );
    visible.pairHistory = assignment.pairHistory?.map((h) => ({
      ...h,
      changedBy: "teacher",
      reason: "",
      finalizedSnapshot: undefined,
      scoreOverrides: undefined,
      votes: h.votes.filter((v) => v.userId === userId),
      pairs: h.pairs.filter((p) => p.evaluator_user_id === userId),
      comparisons: h.comparisons.filter((c) => c.evaluator_user_id === userId),
    }));
  }
  return visible;
}
