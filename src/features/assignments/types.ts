import type { PairAssignment, Comparison } from "@/features/pairwise/types";

export type Appeal = {
  id: string;
  studentId: string;
  message: string;
  submittedAt: string;
  finalizedAt: string;
  generation: number;
  decision?: {
    outcome: "uphold" | "override";
    response: string;
    score?: number;
    decidedBy: string;
    decidedAt: string;
  };
};
export type PairScope = "group" | "individual" | "both";
export type EvaluationSubmission = {
  id: string;
  evaluatorId: string;
  side: "GROUP" | "INDIVIDUAL";
  generation: number;
  revision: number;
  submittedAt: string;
  comparisons: Comparison[];
};
export type PairHistory = {
  generation: number;
  reason: string;
  changedAt: string;
  changedBy: string;
  pairs: PairAssignment[];
  comparisons: Comparison[];
  evaluationDrafts?: Comparison[];
  evaluationSubmissions?: EvaluationSubmission[];
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
  appeals?: Appeal[];
  /** Public timestamp only; raw finalized inputs remain owner-only. */
  finalizedAt?: string;
  /** New assignments must publish persisted pairs before accepting evaluations. */
  pairwiseRequired?: boolean;
  pairGeneration?: number;
  pairResult?: ReturnType<
    typeof import("@/features/pairwise/domain/generated-results").generatedResult
  >;
  pairs?: PairAssignment[];
  comparisons?: Comparison[];
  evaluationDrafts?: Comparison[];
  evaluationSubmissions?: EvaluationSubmission[];
  pairHistory?: PairHistory[];
  pairingShape?: string;
  pairingSnapshot?: { groups: Group[]; questions: string[] };
  pairingPaused?: boolean;
  pairingReason?: string;
  id: string;
  ownerId: string;
  classroomId?: string;
  classroomRosterManaged?: boolean;
  title: string;
  description: string;
  subject: string;
  deadline: string;
  groupDeadline?: string;
  individualDeadline?: string;
  artifactUrl?: string;
  status: "draft" | "active" | "closed" | "finalized";
  scoreOverrides?: ScoreOverride[];
  finalizedSnapshot?: FinalizedSnapshot;
  lastInterimAt?: string;
  reopenReason?: string;
  evaluationMode?: EvaluationMode;
  questions: string[];
  criteriaWeights?: Record<string, number>;
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
