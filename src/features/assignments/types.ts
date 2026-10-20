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
export type Assignment = {
  id: string;
  ownerId: string;
  classroomId?: string;
  title: string;
  description: string;
  subject: string;
  code: string;
  deadline: string;
  status: "draft" | "active" | "closed";
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
