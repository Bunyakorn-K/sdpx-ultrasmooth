import type { Assignment } from "@/features/assignments/types";
import { generatedCriteria } from "./regeneration";
import { appealScore } from "@/features/assignments/domain/appeals";
import {
  calculateItemScores,
  calculateParticipation,
  calculateParticipationMultiplier,
} from "./scoring-engine";

export function generatedResult(a: Assignment, userId: string) {
  const pairs = a.pairs ?? [];
  const comparisons = a.comparisons ?? [];
  const criteria = generatedCriteria(a);
  const group = a.groups.find((g) => g.members.some((m) => m.id === userId));
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
    );
  const groupScore =
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
  const participation = (side: "GROUP" | "INDIVIDUAL") => {
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
  const groupParticipation = participation("GROUP");
  const individualParticipation = participation("INDIVIDUAL");
  return {
    groupScore,
    individualScore,
    groupParticipation,
    individualParticipation,
    finalScore: appealScore(
      a,
      userId,
      individualScore === null
        ? null
        : Number(
            (
              groupScore * groupParticipation +
              individualScore * individualParticipation
            ).toFixed(3),
          ),
    ),
  };
}
