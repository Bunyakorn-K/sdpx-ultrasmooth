export type Role = "OWNER" | "CO_TEACHER" | "TA" | "STUDENT";

export type Classroom = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  allowed_email_domains: string[];
  status: "ACTIVE" | "ARCHIVED";
  created_by: string;
  created_at: string;
};

export type ClassroomMember = {
  id: string;
  classroom_id: string;
  user_id: string;
  role: Role;
  group_id: string | null;
  email: string;
  display_name: string;
  student_id?: string;
  joined_at: string;
};

export type GroupEntity = {
  id: string;
  classroom_id: string;
  name: string;
  created_at: string;
};

export type AssignmentStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "OPEN"
  | "CLOSED"
  | "FINALIZED"
  | "ARCHIVED";

export type CriterionSide = "GROUP" | "INDIVIDUAL";

export type Criterion = {
  id: string;
  assignment_id: string;
  side: CriterionSide;
  name: string;
  description: string;
  weight_pct: number; // e.g. 40 for 40%
  display_order: number;
};

export type Assignment = {
  id: string;
  classroom_id: string;
  name: string;
  slug: string;
  description: string;
  artifact_url?: string;
  group_max_score: number;
  individual_max_score: number;
  group_deadline_utc: string;
  individual_deadline_utc: string;
  instructor_weight: number;
  target_coverage: number;
  max_workload: number;
  min_comparisons: number;
  score_floor: number;
  score_ceiling: number;
  completion_threshold: number;
  scoring_formula_version: string;
  pairing_seed: number;
  status: AssignmentStatus;
  criteria: Criterion[];
  published_at?: string;
  finalized_at?: string;
  created_by: string;
  created_at: string;
};

export type PairAssignment = {
  id: string;
  assignment_id: string;
  criterion_id: string;
  side: CriterionSide;
  item_a_id: string;
  item_b_id: string;
  evaluator_user_id: string;
  display_left_item_id: string;
  generation: number;
  source: "AUTO" | "INSTRUCTOR_EXTRA" | "INSTRUCTOR_SELF";
  created_at: string;
};

export type ComparisonChoice = 1 | 2 | 3 | 4 | 5 | 6;

export type ComparisonStatus = "DRAFT" | "SUBMITTED" | "EXCLUDED";

export type Comparison = {
  id: string;
  pair_assignment_id: string;
  evaluator_user_id: string;
  choice: ComparisonChoice;
  status: ComparisonStatus;
  time_on_task_ms?: number;
  saved_at: string;
  submitted_at?: string;
  excluded_reason?: string;
  excluded_by?: string;
};

export type ComputedScore = {
  item_id: string;
  criterion_id: string;
  side: CriterionSide;
  comparison_count: number;
  quality_index: number;
  score_ratio: number;
  weighted_score: number;
  flags: string[];
};
