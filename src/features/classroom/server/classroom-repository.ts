import { database } from "@/shared/server/database";
import type { Classroom } from "../types";

export type ClassroomRecord = { classroom: Classroom; version: number };

export interface ClassroomRepository {
  listForUser(userId: string, userEmail?: string): Promise<Classroom[]>;
  findById(id: string): Promise<ClassroomRecord | null>;
  findBySlug(slug: string): Promise<ClassroomRecord | null>;
  findByAssignmentCode?(code: string): Promise<ClassroomRecord | null>;
  create(classroom: Classroom): Promise<boolean>;
  update(classroom: Classroom, version: number): Promise<boolean>;
}

function toRecord(
  row: Record<string, unknown> | undefined,
): ClassroomRecord | null {
  return row
    ? { classroom: row.data as Classroom, version: Number(row.version) }
    : null;
}

export class PostgresClassroomRepository implements ClassroomRepository {
  async listForUser(userId: string, userEmail?: string): Promise<Classroom[]> {
    const sql = database();
    const rows = userEmail
      ? await sql`SELECT data FROM classrooms WHERE owner_id=${userId} OR data->'members' @> ${JSON.stringify([{ user_id: userId }])}::jsonb OR data->'members' @> ${JSON.stringify([{ email: userEmail.toLowerCase() }])}::jsonb ORDER BY data->>'created_at' DESC`
      : await sql`SELECT data FROM classrooms WHERE owner_id=${userId} OR data->'members' @> ${JSON.stringify([{ user_id: userId }])}::jsonb ORDER BY data->>'created_at' DESC`;
    return rows.map((row) => row.data as Classroom);
  }

  async findById(id: string): Promise<ClassroomRecord | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null;
    }
    const sql = database();
    return toRecord(
      (await sql`SELECT data, version FROM classrooms WHERE id=${id}`)[0],
    );
  }

  async findBySlug(slug: string): Promise<ClassroomRecord | null> {
    const sql = database();
    return toRecord(
      (await sql`SELECT data, version FROM classrooms WHERE slug=${slug} OR LOWER(slug)=${slug.toLowerCase()}`)[0],
    );
  }

  async findByAssignmentCode(code: string): Promise<ClassroomRecord | null> {
    const sql = database();
    const rows = await sql`
      SELECT c.data, c.version
      FROM classrooms c
      JOIN assignments a ON (a.data->>'classroomId')::uuid = c.id
      WHERE a.code = ${code.toUpperCase()} OR a.code = ${code}
      LIMIT 1
    `;
    return toRecord(rows[0]);
  }

  async create(classroom: Classroom): Promise<boolean> {
    const sql = database();
    const rows =
      await sql`INSERT INTO classrooms(id, owner_id, slug, data) VALUES(${classroom.id}, ${classroom.created_by}, ${classroom.slug}, ${JSON.stringify(classroom)}::jsonb) ON CONFLICT(slug) DO NOTHING RETURNING id`;
    return rows.length > 0;
  }

  async update(classroom: Classroom, version: number): Promise<boolean> {
    const sql = database();
    const rows =
      await sql`UPDATE classrooms SET data=${JSON.stringify(classroom)}::jsonb, version=version+1 WHERE id=${classroom.id} AND version=${version} RETURNING id`;
    return rows.length > 0;
  }
}

export { PostgresClassroomRepository as NeonClassroomRepository, PostgresClassroomRepository as SupabaseClassroomRepository };
