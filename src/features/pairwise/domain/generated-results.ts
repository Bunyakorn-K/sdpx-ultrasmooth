import type { Assignment } from "@/features/assignments/types";
import { generatedCriteria } from "./regeneration";
import { appealScore } from "@/features/assignments/domain/appeals";
import {
  calculateItemScores,
  calculateParticipation,
  calculateParticipationMultiplier,
  type EvaluatorRoleMap,
} from "./scoring-engine";

export function generatedResult(a: Assignment, userId: string) {
  // FR-SCORE-09: If assignment is finalized and snapshot scores exist, serve immutable frozen outputs.
  if (a.status === "finalized" && a.finalizedSnapshot?.outputs?.scores) {
    const frozenScores = a.finalizedSnapshot.outputs.scores as Record<
      string,
      {
        groupScore: number;
        individualScore: number | null;
        finalScore: number | null;
        groupParticipation?: number;
        individualParticipation?: number;
        participation?: number;
        multiplier?: number;
      }
    >;
    const frozen = frozenScores[userId];
    if (frozen) {
      const finalScore = appealScore(a, userId, frozen.finalScore);
      return {
        groupScore: frozen.groupScore,
        individualScore: frozen.individualScore,
        groupParticipation: frozen.groupParticipation ?? 1.0,
        individualParticipation: frozen.individualParticipation ?? 1.0,
        participation: frozen.participation ?? 1.0,
        multiplier: frozen.multiplier ?? 1.0,
        finalScore,
      };
    }
  }

  const pairs = a.pairs ?? [];
  const comparisons = a.comparisons ?? [];
  const criteria = generatedCriteria(a);
  const group = a.groups.find((g) => g.members.some((m) => m.id === userId));

  // FR-SCORE-03: Instructor Weight applied to evaluations submitted by the owner/instructor
  const evaluatorRoles: EvaluatorRoleMap = a.ownerId
    ? { [a.ownerId]: "OWNER" }
    : {};
  const instructorWeight = a.instructorWeight ?? 1.0;

  const scores = (id: string, side: "GROUP" | "INDIVIDUAL", max: number) =>
    calculateItemScores(
      id,
      side,
      criteria,
      pairs,
      comparisons,
      max,
      a.scoreFloor ?? 0.6,
      a.scoreCeiling ?? 1,
      a.minComparisons ?? 3,
      evaluatorRoles,
      instructorWeight,
    );

  let groupScore =
    group && pairs.some((p) => p.side === "GROUP")
      ? scores(group.id, "GROUP", a.groupMaxScore ?? 15).totalScore
      : 0;
  const individual =
    group &&
    group.members.length > 2 &&
    pairs.some((p) => p.side === "INDIVIDUAL")
      ? scores(userId, "INDIVIDUAL", a.individualMaxScore ?? 5)
      : null;
  const individualScore = individual ? individual.displayScore : 0;

  // FR-SCORE-04 (PRD §9.4): Participation Multiplier
  // Single task-weighted participation across all assigned comparison tasks:
  // p = submitted_total / assigned_total
  // M = min(1.0, p / completion_threshold)
  const assignedPairs = pairs.filter((p) => p.evaluator_user_id === userId);
  const assignedIds = new Set(assignedPairs.map((p) => p.id));
  const submittedCount = comparisons.filter(
    (c) => assignedIds.has(c.pair_assignment_id) && c.status === "SUBMITTED",
  ).length;

  const sideMultiplier = (side: "GROUP" | "INDIVIDUAL") => {
    const assigned = pairs.filter(
      (p) => p.evaluator_user_id === userId && p.side === side,
    );
    const ids = new Set(assigned.map((p) => p.id));
    return calculateParticipationMultiplier(
      calculateParticipation(
        comparisons.filter(
          (c) => ids.has(c.pair_assignment_id) && c.status === "SUBMITTED",
        ).length,
        assigned.length,
      ),
      a.completionThreshold ?? 0.9,
    );
  };
  const groupParticipation = sideMultiplier("GROUP");
  const individualParticipation = sideMultiplier("INDIVIDUAL");

  const p = calculateParticipation(submittedCount, assignedPairs.length);
  const M = calculateParticipationMultiplier(p, a.completionThreshold ?? 0.9);

  // FR-SCORE-08: Check instructor score overrides
  const groupOverride = a.scoreOverrides?.find(
    (o) => o.targetType === "group" && o.targetId === group?.id,
  );
  if (groupOverride) {
    groupScore = groupOverride.overriddenScore;
  }
  const studentOverride = a.scoreOverrides?.find(
    (o) => o.targetType === "student" && o.targetId === userId,
  );

  let finalScore: number | null = null;
  if (studentOverride) {
    finalScore = studentOverride.overriddenScore;
  } else if (individualScore !== null) {
    // (Group + Individual) * M
    finalScore = Number(((groupScore + individualScore) * M).toFixed(3));
  }

  return {
    groupScore,
    individualScore,
    groupParticipation,
    individualParticipation,
    participation: p,
    multiplier: M,
    finalScore: appealScore(a, userId, finalScore),
  };
}
