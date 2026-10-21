import { database } from "@/shared/server/database";
import type { AuditLogEntry } from "../types";

export interface AuditRepository {
  record(entry: AuditLogEntry): Promise<void>;
  listByClassroom(classroomId: string, limit?: number): Promise<AuditLogEntry[]>;
  listByAssignment(assignmentId: string, limit?: number): Promise<AuditLogEntry[]>;
}

function toEntry(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: String(row.id),
    actor_id: String(row.actor_id),
    action: row.action as AuditLogEntry["action"],
    resource_type: String(row.resource_type),
    resource_id: String(row.resource_id),
    classroom_id: row.classroom_id ? String(row.classroom_id) : null,
    assignment_id: row.assignment_id ? String(row.assignment_id) : null,
    before_state: (row.before_state as Record<string, unknown>) || null,
    after_state: (row.after_state as Record<string, unknown>) || null,
    reason: row.reason ? String(row.reason) : null,
    ip_address: row.ip_address ? String(row.ip_address) : null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export class PostgresAuditRepository implements AuditRepository {
  async record(entry: AuditLogEntry): Promise<void> {
    const sql = database();
    await sql`
      INSERT INTO audit_logs (
        id, actor_id, action, resource_type, resource_id,
        classroom_id, assignment_id, before_state, after_state,
        reason, ip_address, created_at
      ) VALUES (
        ${entry.id},
        ${entry.actor_id},
        ${entry.action},
        ${entry.resource_type},
        ${entry.resource_id},
        ${entry.classroom_id || null},
        ${entry.assignment_id || null},
        ${entry.before_state ? JSON.stringify(entry.before_state) : null}::jsonb,
        ${entry.after_state ? JSON.stringify(entry.after_state) : null}::jsonb,
        ${entry.reason || null},
        ${entry.ip_address || null},
        ${entry.created_at}
      )
    `;
  }

  async listByClassroom(classroomId: string, limit = 100): Promise<AuditLogEntry[]> {
    const sql = database();
    const rows = await sql`
      SELECT id, actor_id, action, resource_type, resource_id, classroom_id, assignment_id,
             before_state, after_state, reason, ip_address, created_at
      FROM audit_logs
      WHERE classroom_id = ${classroomId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map(toEntry);
  }

  async listByAssignment(assignmentId: string, limit = 100): Promise<AuditLogEntry[]> {
    const sql = database();
    const rows = await sql`
      SELECT id, actor_id, action, resource_type, resource_id, classroom_id, assignment_id,
             before_state, after_state, reason, ip_address, created_at
      FROM audit_logs
      WHERE assignment_id = ${assignmentId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map(toEntry);
  }
}
