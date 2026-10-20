import { database } from "@/shared/server/database";
import type { Assignment } from "../types";
export type AssignmentRecord = { assignment: Assignment; version: number };
export interface AssignmentRepository {
  listForUser(userId: string, userEmail?: string): Promise<Assignment[]>;
  findById(id: string): Promise<AssignmentRecord | null>;
  findByCode(code: string): Promise<AssignmentRecord | null>;
  create(assignment: Assignment): Promise<boolean>;
  update(assignment: Assignment, version: number): Promise<boolean>;
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
  async update(assignment: Assignment, version: number) {
    const sql = database();
    const rows =
      await sql`UPDATE assignments SET data=${JSON.stringify(assignment)}::jsonb,version=version+1 WHERE id=${assignment.id} AND version=${version} RETURNING id`;
    return rows.length > 0;
  }
}
export { PostgresAssignmentRepository as NeonAssignmentRepository, PostgresAssignmentRepository as SupabaseAssignmentRepository };
