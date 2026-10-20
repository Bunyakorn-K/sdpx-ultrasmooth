import { database } from "@/shared/server/database";
import type { Classroom } from "../types";

export type ClassroomRecord = { classroom: Classroom; version: number };

export interface ClassroomRepository {
  listForUser(userId: string): Promise<Classroom[]>;
  findById(id: string): Promise<ClassroomRecord | null>;
  findBySlug(slug: string): Promise<ClassroomRecord | null>;
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
  async listForUser(userId: string): Promise<Classroom[]> {
    const sql = database();
    const rows =
      await sql`SELECT data FROM classrooms WHERE owner_id=${userId} OR data->'members' @> ${JSON.stringify([{ user_id: userId }])}::jsonb ORDER BY data->>'created_at' DESC`;
    return rows.map((row) => row.data as Classroom);
  }

  async findById(id: string): Promise<ClassroomRecord | null> {
    const sql = database();
    return toRecord(
      (await sql`SELECT data, version FROM classrooms WHERE id=${id}`)[0],
    );
  }

  async findBySlug(slug: string): Promise<ClassroomRecord | null> {
    const sql = database();
    return toRecord(
      (await sql`SELECT data, version FROM classrooms WHERE slug=${slug}`)[0],
    );
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
