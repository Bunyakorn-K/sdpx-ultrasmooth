import type { PairAssignment, Comparison } from "@/features/pairwise/types";
export type PairScope = "group" | "individual" | "both";
export type PairHistory = {
  generation: number;
  reason: string;
  changedAt: string;
  changedBy: string;
  pairs: PairAssignment[];
  comparisons: Comparison[];
  votes: Vote[];
  groups: Group[];
  questions: string[];
  finalizedSnapshot?: FinalizedSnapshot;
  scoreOverrides?: ScoreOverride[];
};
export type Group = {
  id: string;
  name: string;
  members: { id: string; name: string }[];
};
export type EvaluationMode = "group" | "individual";
type VoteAnswer = {
  userId: string;
  scores: number[];
  createdAt: string;
};
export type Vote = VoteAnswer &
  (
    | { groupId: string; studentId?: never }
    | { studentId: string; groupId?: never }
  );
export type ScoreOverride = {
  targetId: string;
  targetType: "student" | "group";
  originalScore?: number;
  overriddenScore: number;
  reason: string;
  overriddenBy: string;
  overriddenAt: string;
};

export type FinalizedSnapshot = {
  finalizedAt: string;
  finalizedBy: string;
  inputs: {
    pairs?: PairAssignment[];
    comparisons?: Comparison[];
    votes: Vote[];
    groups: Group[];
    questions: string[];
  };
  outputs: {
    overrides?: ScoreOverride[];
    scores?: Record<string, unknown>;
  };
};

export type Assignment = {
  pairGeneration?: number;
  pairResult?: ReturnType<
    typeof import("@/features/pairwise/domain/generated-results").generatedResult
  >;
  pairs?: PairAssignment[];
  comparisons?: Comparison[];
  pairHistory?: PairHistory[];
  pairingShape?: string;
  pairingSnapshot?: { groups: Group[]; questions: string[] };
  pairingPaused?: boolean;
  pairingReason?: string;
  id: string;
  ownerId: string;
  classroomId?: string;
  title: string;
  description: string;
  subject: string;
  code: string;
  deadline: string;
  status: "draft" | "active" | "closed" | "finalized";
  scoreOverrides?: ScoreOverride[];
  finalizedSnapshot?: FinalizedSnapshot;
  reopenReason?: string;
  evaluationMode?: EvaluationMode;
  questions: string[];
  groups: Group[];
  students: { id: string; name: string }[];
  votes: Vote[];
  createdAt: string;
  color: string;
  groupMaxScore?: number;
  individualMaxScore?: number;
  scoreFloor?: number;
  scoreCeiling?: number;
  targetCoverage?: number;
  minComparisons?: number;
  completionThreshold?: number;
  instructorWeight?: number;
  maxWorkload?: number;
};
