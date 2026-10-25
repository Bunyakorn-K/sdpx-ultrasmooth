import { database } from "@/shared/server/database";
import type { Classroom } from "../types";
import { ROSTER_PENDING_PASSWORD } from "@/features/auth/domain/pending-account";

export type ClassroomRecord = { classroom: Classroom; version: number };

export interface ClassroomRepository {
  listForUser(userId: string, userEmail?: string): Promise<Classroom[]>;
  findById(id: string): Promise<ClassroomRecord | null>;
  findBySlug(slug: string): Promise<ClassroomRecord | null>;
  create(classroom: Classroom): Promise<boolean>;
  update(
    classroom: Classroom,
    version: number,
    provisionStudents?: boolean,
  ): Promise<boolean>;
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
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
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
      (
        await sql`SELECT data, version FROM classrooms WHERE slug=${slug} OR LOWER(slug)=${slug.toLowerCase()}`
      )[0],
    );
  }


  async create(classroom: Classroom): Promise<boolean> {
    const sql = database();
    const rows =
      await sql`INSERT INTO classrooms(id, owner_id, slug, data) VALUES(${classroom.id}, ${classroom.created_by}, ${classroom.slug}, ${JSON.stringify(classroom)}::jsonb) ON CONFLICT(slug) DO NOTHING RETURNING id`;
    return rows.length > 0;
  }

  async update(
    classroom: Classroom,
    version: number,
    provisionStudents = false,
  ): Promise<boolean> {
    const sql = database();
    if (provisionStudents) {
      // Lock the aggregate before provisioning. Losing an optimistic-lock race must
      // never create accounts for an import that was not committed.
      const rows = await sql`WITH candidate AS MATERIALIZED (
        SELECT id FROM classrooms WHERE id=${classroom.id} AND version=${version} FOR UPDATE
      ), accounts AS (
        INSERT INTO users(id,name,email,password_hash,role)
        SELECT (m->>'user_id')::uuid,m->>'display_name',m->>'email',${ROSTER_PENDING_PASSWORD},'student'
        FROM candidate CROSS JOIN jsonb_array_elements(${JSON.stringify(classroom.members)}::jsonb) m
        WHERE m->>'role'='STUDENT'
        ORDER BY m->>'email'
        ON CONFLICT(email) DO UPDATE SET email=users.email
        RETURNING id,email,password_hash
      )
      UPDATE classrooms SET data=jsonb_set(${JSON.stringify(classroom)}::jsonb,'{members}',(
        SELECT jsonb_agg(CASE WHEN a.id IS NULL THEN m ELSE
          m || jsonb_build_object('user_id',a.id::text,'status',CASE WHEN a.password_hash=${ROSTER_PENDING_PASSWORD} THEN 'PENDING' ELSE 'ACTIVE' END)
        END ORDER BY ord)
        FROM jsonb_array_elements(${JSON.stringify(classroom.members)}::jsonb) WITH ORDINALITY AS member(m,ord)
        LEFT JOIN accounts a ON a.email=m->>'email' AND m->>'role'='STUDENT'
      )),version=version+1 WHERE id IN (SELECT id FROM candidate) RETURNING data`;
      if (!rows.length) return false;
      // Return exactly the persisted identities to callers, including preview consumers.
      Object.assign(classroom, rows[0].data as Classroom);
      return true;
    }
    const rows =
      await sql`UPDATE classrooms SET data=${JSON.stringify(classroom)}::jsonb, version=version+1 WHERE id=${classroom.id} AND version=${version} RETURNING id`;
    return rows.length > 0;
  }
}

export {
  PostgresClassroomRepository as NeonClassroomRepository,
  PostgresClassroomRepository as SupabaseClassroomRepository,
};
