import { database } from "@/shared/server/database";
import type { Assignment } from "../types";
import type { NotificationEvent } from "@/features/notifications/types";
export type AssignmentRecord = { assignment: Assignment; version: number };
export interface AssignmentRepository {
  listForUser(userId: string, userEmail?: string): Promise<Assignment[]>;
  findById(id: string): Promise<AssignmentRecord | null>;
  findByCode(code: string): Promise<AssignmentRecord | null>;
  create(assignment: Assignment): Promise<boolean>;
  update(
    assignment: Assignment,
    version: number,
    event?: NotificationEvent,
  ): Promise<boolean>;
}
function toRecord(
  row: Record<string, unknown> | undefined,
): AssignmentRecord | null {
  return row
    ? { assignment: row.data as Assignment, version: Number(row.version) }
    : null;
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
    return rows.map((row) => row.data as Assignment);
  }
  async findById(id: string) {
    const sql = database();
    return toRecord(
      (await sql`SELECT data,version FROM assignments WHERE id=${id}`)[0],
    );
  }
  async findByCode(code: string) {
    const sql = database();
    return toRecord(
      (await sql`SELECT data,version FROM assignments WHERE code=${code}`)[0],
    );
  }
  async create(assignment: Assignment) {
    const sql = database();
    const rows =
      await sql`INSERT INTO assignments(id,owner_id,code,data) VALUES(${assignment.id},${assignment.ownerId},${assignment.code},${JSON.stringify(assignment)}::jsonb) ON CONFLICT(code) DO NOTHING RETURNING id`;
    return rows.length > 0;
  }
  async update(
    assignment: Assignment,
    version: number,
    event?: NotificationEvent,
  ) {
    const sql = database();
    const rows = await sql`WITH updated AS (
        UPDATE assignments SET data=${JSON.stringify(assignment)}::jsonb,version=version+1
        WHERE id=${assignment.id} AND version=${version} RETURNING id,data,owner_id
      ), delivered AS (
        INSERT INTO notifications(id,user_id,assignment_id,kind,event_key)
        SELECT gen_random_uuid(),u.id,a.id,${event?.kind ?? null},${event?.key ?? null}
        FROM updated a JOIN users u ON u.role='student' AND u.id<>a.owner_id
        WHERE ${event !== undefined} AND (
          a.data->'students' @> jsonb_build_array(jsonb_build_object('id',u.id::text))
          OR EXISTS (SELECT 1 FROM classrooms c CROSS JOIN LATERAL jsonb_array_elements(c.data->'members') m
            WHERE (c.id::text=a.data->>'classroomId' OR c.data->'assignment_ids' ? a.id::text)
            AND m->>'role'='STUDENT' AND (m->>'user_id'=u.id::text OR lower(m->>'email')=lower(u.email)))
        ) ON CONFLICT(user_id,event_key) DO NOTHING RETURNING id
      ), audited AS (
        INSERT INTO audit_logs(id,actor_id,action,resource_type,resource_id,assignment_id,before_state,after_state)
        SELECT gen_random_uuid(),owner_id,'ASSIGNMENT_FINALIZE','assignment',id::text,id,
          '{"status":"closed"}'::jsonb,'{"status":"finalized"}'::jsonb
        FROM updated WHERE ${event?.kind ?? null}='results_finalized' RETURNING id
      ) SELECT id FROM updated`;
    return rows.length > 0;
  }
}
export {
  PostgresAssignmentRepository as NeonAssignmentRepository,
  PostgresAssignmentRepository as SupabaseAssignmentRepository,
};
