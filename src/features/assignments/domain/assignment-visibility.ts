import type { Assignment } from "../types";
import { generatedResult } from "@/features/pairwise/domain/generated-results";
export function visibleAssignment(
  assignment: Assignment,
  userId: string,
): Assignment {
  if (
    assignment.ownerId === userId &&
    !assignment.evaluationDrafts?.length &&
    !assignment.pairHistory?.some((h) => h.evaluationDrafts?.length)
  )
    return assignment;
  if (assignment.ownerId === userId)
    return {
      ...assignment,
      evaluationDrafts: undefined,
      pairHistory: assignment.pairHistory?.map((h) => ({
        ...h,
        evaluationDrafts: undefined,
      })),
    };
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
    visible.evaluationDrafts = assignment.evaluationDrafts?.filter(
      (c) => c.evaluator_user_id === userId,
    );
    visible.evaluationSubmissions = assignment.evaluationSubmissions?.filter(
      (s) => s.evaluatorId === userId,
    );
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
      evaluationDrafts: h.evaluationDrafts?.filter(
        (c) => c.evaluator_user_id === userId,
      ),
      evaluationSubmissions: h.evaluationSubmissions?.filter(
        (s) => s.evaluatorId === userId,
      ),
    }));
  }
  return visible;
}
