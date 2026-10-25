import { database } from "@/shared/server/database";
import type { Assignment, EvaluationSubmission } from "../types";
import type { NotificationEvent } from "@/features/notifications/types";

export type AssignmentRecord = { assignment: Assignment; version: number };
export type AppealAudit = {
  actorId: string;
  action: "APPEAL_SUBMIT" | "APPEAL_RESOLVE" | "SCORE_OVERRIDE";
  appealId: string;
  before: unknown;
  after: unknown;
  reason: string;
};
export interface AssignmentRepository {
  listForUser(userId: string, userEmail?: string): Promise<Assignment[]>;
  findById(id: string): Promise<AssignmentRecord | null>;
  create(assignment: Assignment): Promise<boolean>;
  update(
    assignment: Assignment,
    version: number,
    event?: NotificationEvent,
    submissionAudit?: EvaluationSubmission,
    appealAudit?: AppealAudit,
  ): Promise<boolean>;
}
function toRecord(
  row: Record<string, unknown> | undefined,
): AssignmentRecord | null {
  return row
    ? { assignment: assignmentData(row.data), version: Number(row.version) }
    : null;
}
function assignmentData(value: unknown): Assignment {
  const assignment = { ...(value as Assignment) };
  // Old rows remain readable during rollout before the schema cleanup runs.
  Reflect.deleteProperty(assignment, "code");
  return assignment;
}
export class PostgresAssignmentRepository implements AssignmentRepository {
  async listForUser(userId: string, userEmail?: string) {
    const sql = database();
    const hasEmail = Boolean(userEmail);
    const emailJson = JSON.stringify([{ email: userEmail || "" }]);
    const userJson = JSON.stringify([{ user_id: userId }]);
    const studentJson = JSON.stringify([{ id: userId }]);

    const rows = await sql`
      SELECT a.data 
      FROM assignments a 
      WHERE a.owner_id = ${userId} 
         OR a.data->'students' @> ${studentJson}::jsonb 
         OR a.data->>'classroomId' IN (
            SELECT c.id::text FROM classrooms c 
            WHERE c.owner_id = ${userId} 
               OR c.data->'members' @> ${userJson}::jsonb
               OR (${hasEmail} AND c.data->'members' @> ${emailJson}::jsonb)
         )
         OR a.id::text IN (
            SELECT jsonb_array_elements_text(
              CASE 
                WHEN jsonb_typeof(c.data->'assignment_ids') = 'array' THEN c.data->'assignment_ids' 
                ELSE '[]'::jsonb 
              END
            )
            FROM classrooms c
            WHERE c.owner_id = ${userId} 
               OR c.data->'members' @> ${userJson}::jsonb
               OR (${hasEmail} AND c.data->'members' @> ${emailJson}::jsonb)
         )
      ORDER BY a.data->>'createdAt' DESC
    `;
    return rows.map((row) => assignmentData(row.data));
  }
  async findById(id: string) {
    const sql = database();
    return toRecord(
      (await sql`SELECT data,version FROM assignments WHERE id=${id}`)[0],
    );
  }
  async create(assignment: Assignment) {
    const sql = database();
    const rows =
      await sql`INSERT INTO assignments(id,owner_id,data) VALUES(${assignment.id},${assignment.ownerId},${JSON.stringify(assignment)}::jsonb) ON CONFLICT(id) DO NOTHING RETURNING id`;
    return rows.length > 0;
  }
  async update(
    assignment: Assignment,
    version: number,
    event?: NotificationEvent,
    submissionAudit?: EvaluationSubmission,
    appealAudit?: AppealAudit,
  ) {
    const sql = database();
    const rows = await sql`WITH updated AS (
        UPDATE assignments SET data=${JSON.stringify(assignment)}::jsonb,version=version+1
        WHERE id=${assignment.id} AND version=${version} RETURNING id,data,owner_id
      ), delivered AS (
        INSERT INTO notifications(id,user_id,assignment_id,kind,event_key)
        SELECT gen_random_uuid(),u.id,a.id,${event?.kind ?? null},${event?.key ?? null}
        FROM updated a JOIN users u ON u.role='student' AND u.id<>a.owner_id
        WHERE ${event !== undefined && !["pairs_paused", "pairs_reopened"].includes(event?.kind ?? "")}
        AND (${event?.recipientIds === undefined} OR u.id::text IN (SELECT jsonb_array_elements_text(${JSON.stringify(event?.recipientIds ?? [])}::jsonb))) AND (
          a.data->'students' @> jsonb_build_array(jsonb_build_object('id',u.id::text))
          OR EXISTS (SELECT 1 FROM classrooms c CROSS JOIN LATERAL jsonb_array_elements(c.data->'members') m
            WHERE (c.id::text=a.data->>'classroomId' OR c.data->'assignment_ids' ? a.id::text)
            AND m->>'role'='STUDENT' AND (m->>'user_id'=u.id::text OR lower(m->>'email')=lower(u.email)))
        ) ON CONFLICT(user_id,event_key) DO NOTHING RETURNING id
      ), audited AS (
        INSERT INTO audit_logs(id,actor_id,action,resource_type,resource_id,assignment_id,before_state,after_state,reason)
        SELECT gen_random_uuid(),owner_id,
          CASE ${event?.kind ?? null} WHEN 'assignment_opened' THEN 'ASSIGNMENT_PUBLISH' WHEN 'pairs_regenerated' THEN 'PAIRS_REGENERATE' WHEN 'pairs_paused' THEN 'ASSIGNMENT_UNPUBLISH' WHEN 'pairs_reopened' THEN 'ASSIGNMENT_REOPEN' ELSE 'ASSIGNMENT_FINALIZE' END,
          'assignment',id::text,id,
          ${JSON.stringify(event?.kind === "results_finalized" ? { status: "closed" } : { generation: event?.generation })}::jsonb,
          ${JSON.stringify(event?.kind === "results_finalized" ? { status: "finalized" } : { generation: assignment.pairGeneration ?? 0, scope: event?.scope, status: assignment.status })}::jsonb,
          ${event?.reason ?? null}
        FROM updated WHERE ${event?.kind ?? null} IN ('assignment_opened','results_finalized','pairs_regenerated','pairs_paused','pairs_reopened') RETURNING id
      ), submission_audited AS (
        INSERT INTO audit_logs(id,actor_id,action,resource_type,resource_id,assignment_id,after_state)
        SELECT gen_random_uuid(),${submissionAudit?.evaluatorId ?? null}::uuid,'EVALUATION_SUBMIT','assignment',id::text,id,
          ${JSON.stringify(submissionAudit ? { side: submissionAudit.side, generation: submissionAudit.generation, revision: submissionAudit.revision, answered: submissionAudit.comparisons.length } : {})}::jsonb
        FROM updated WHERE ${submissionAudit !== undefined} RETURNING id
      ), appeal_audited AS (
        INSERT INTO audit_logs(id,actor_id,action,resource_type,resource_id,assignment_id,before_state,after_state,reason)
        SELECT gen_random_uuid(),${appealAudit?.actorId ?? null}::uuid,${appealAudit?.action ?? null},'appeal',${appealAudit?.appealId ?? null},id,
          ${JSON.stringify(appealAudit?.before ?? null)}::jsonb,${JSON.stringify(appealAudit?.after ?? null)}::jsonb,${appealAudit?.reason ?? null}
        FROM updated WHERE ${appealAudit !== undefined} RETURNING id
      ) SELECT id FROM updated`;
    return rows.length > 0;
  }
}
export {
  PostgresAssignmentRepository as NeonAssignmentRepository,
  PostgresAssignmentRepository as SupabaseAssignmentRepository,
};
