import type { Assignment } from "../types";
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
  return visible;
}
