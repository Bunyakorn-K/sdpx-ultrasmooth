import type { Assignment } from "@/features/assignments/types";
import {
  canEvaluateTarget,
  evaluationTargets,
} from "@/features/assignments/domain/evaluation-targets";
import type { NotificationEvent } from "../types";

export function assignmentEvent(
  previousStatus: Assignment["status"],
  assignment: Assignment,
  version: number,
): NotificationEvent | undefined {
  const kind =
    previousStatus !== "active" && assignment.status === "active"
      ? "assignment_opened"
      : previousStatus !== "finalized" && assignment.status === "finalized"
        ? "results_finalized"
        : undefined;
  return kind
    ? { kind, key: `${assignment.id}:${kind}:${version + 1}` }
    : undefined;
}

export function deadlineReminder(
  assignment: Assignment,
  userId: string,
  now = Date.now(),
): NotificationEvent | undefined {
  const remaining = new Date(assignment.deadline).getTime() - now;
  if (
    assignment.status !== "active" ||
    remaining <= 0 ||
    remaining > 48 * 60 * 60 * 1000
  )
    return;
  const incomplete = assignment.pairs
    ? assignment.pairs.some(
        (p) =>
          p.evaluator_user_id === userId &&
          !assignment.comparisons?.some(
            (c) => c.pair_assignment_id === p.id && c.status === "SUBMITTED",
          ),
      )
    : evaluationTargets(assignment).some(
        (target) =>
          canEvaluateTarget(assignment, userId, target.id) &&
          !assignment.votes.some(
            (vote) =>
              vote.userId === userId &&
              (vote.groupId ?? vote.studentId) === target.id,
          ),
      );
  return incomplete
    ? {
        kind: "deadline_reminder",
        key: `${assignment.id}:deadline:${assignment.deadline}${assignment.pairGeneration ? `:generation:${assignment.pairGeneration}` : ""}`,
      }
    : undefined;
}
