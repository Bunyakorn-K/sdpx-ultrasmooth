import { database } from "@/shared/server/database";
import type { Assignment } from "@/features/assignments/types";
import type {
  Notification,
  NotificationEvent,
  NotificationPage,
} from "../types";

export type NotificationCursor = { time: string; id: string };
export interface NotificationRepository {
  remind(
    userId: string,
    assignment: Assignment,
    event: NotificationEvent,
  ): Promise<void>;
  list(
    userId: string,
    assignmentIds: string[],
    cursor?: NotificationCursor,
  ): Promise<NotificationPage>;
  read(userId: string, assignmentIds: string[], id?: string): Promise<boolean>;
}

export class PostgresNotificationRepository implements NotificationRepository {
  async remind(
    userId: string,
    assignment: Assignment,
    event: NotificationEvent,
  ) {
    const sql = database();
    // Comparing the aggregate prevents a stale reminder after a concurrent vote/close.
    await sql`INSERT INTO notifications(id,user_id,assignment_id,kind,event_key)
      SELECT gen_random_uuid(),u.id,a.id,${event.kind},${event.key}
      FROM assignments a JOIN users u ON u.id=${userId}::uuid AND u.role='student'
      WHERE a.id=${assignment.id}::uuid AND a.data=${JSON.stringify(assignment)}::jsonb
      ON CONFLICT(user_id,event_key) DO NOTHING`;
  }
  async list(
    userId: string,
    assignmentIds: string[],
    cursor?: NotificationCursor,
  ): Promise<NotificationPage> {
    const sql = database();
    const ids = JSON.stringify(assignmentIds);
    const [rows, totals] = await Promise.all([
      sql`SELECT id,assignment_id,kind,created_at,read_at,
        to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time FROM notifications
        WHERE user_id=${userId}::uuid AND assignment_id::text IN (SELECT jsonb_array_elements_text(${ids}::jsonb))
        AND (${!cursor} OR (created_at,id)<(${cursor?.time ?? null}::text::timestamptz,${cursor?.id ?? null}::uuid))
        ORDER BY created_at DESC,id DESC LIMIT 21`,
      sql`SELECT count(*)::int AS count FROM notifications WHERE user_id=${userId}::uuid AND read_at IS NULL
        AND assignment_id::text IN (SELECT jsonb_array_elements_text(${ids}::jsonb))`,
    ]);
    const items: Notification[] = rows.slice(0, 20).map((row) => ({
      id: String(row.id),
      assignmentId: String(row.assignment_id),
      kind: row.kind as Notification["kind"],
      createdAt: new Date(String(row.created_at)).toISOString(),
      readAt: row.read_at ? new Date(String(row.read_at)).toISOString() : null,
    }));
    const last = items.at(-1);
    return {
      items,
      unreadCount: Number(totals[0]?.count ?? 0),
      nextCursor:
        rows.length > 20 && last ? `${rows[19].cursor_time}|${last.id}` : null,
    };
  }
  async read(userId: string, assignmentIds: string[], id?: string) {
    const sql = database();
    const rows =
      await sql`UPDATE notifications SET read_at=COALESCE(read_at,now())
      WHERE user_id=${userId}::uuid AND (${id === undefined} OR id=${id ?? null}::uuid)
      AND assignment_id::text IN (SELECT jsonb_array_elements_text(${JSON.stringify(assignmentIds)}::jsonb)) RETURNING id`;
    return id === undefined || rows.length > 0;
  }
}
