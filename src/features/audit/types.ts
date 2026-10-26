export type AuditAction =
  | "APPEAL_SUBMIT"
  | "APPEAL_RESOLVE"
  | "EVALUATION_SUBMIT"
  | "ASSIGNMENT_PUBLISH"
  | "ASSIGNMENT_UNPUBLISH"
  | "PAIRS_REGENERATE"
  | "PAIRS_ASSIGN_EXTRA"
  | "SCORE_OVERRIDE"
  | "ASSIGNMENT_FINALIZE"
  | "ASSIGNMENT_REOPEN"
  | "EXPORT_IDENTITY"
  | "VIEW_EVALUATOR_IDENTITY"
  | "ROLE_CHANGE"
  | "UPDATE_DEADLINE";

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string;
  classroom_id?: string | null;
  assignment_id?: string | null;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  reason?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface CreateAuditEntryInput {
  actor_id: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string;
  classroom_id?: string | null;
  assignment_id?: string | null;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  reason?: string | null;
  ip_address?: string | null;
}
