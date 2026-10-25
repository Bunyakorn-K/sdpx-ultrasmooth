import { database } from "@/shared/server/database";

export type EvaluatorIdentity = { id: string; name: string; email: string };
export interface ExportIdentityRepository {
  findByIds(ids: string[]): Promise<EvaluatorIdentity[]>;
}
export class PostgresExportIdentityRepository implements ExportIdentityRepository {
  async findByIds(ids: string[]) {
    if (!ids.length) return [];
    const sql = database();
    const rows = await sql`SELECT id::text,name,email FROM users
      WHERE id::text IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))`;
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      email: String(r.email),
    }));
  }
}
