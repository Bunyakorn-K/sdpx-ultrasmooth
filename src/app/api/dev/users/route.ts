import { database } from "@/shared/server/database";
import { hashPassword } from "@/features/auth/server/password-service";
import { createSession } from "@/features/auth/server/session-service";
import { randomInt, randomUUID } from "node:crypto";
import type { User } from "@/features/auth/types";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  try {
    const sql = database();
    const rows = await sql`
      SELECT id, name, email, role, created_at
      FROM users
      WHERE password_hash != '!roster-pending'
      ORDER BY role DESC, created_at DESC
      LIMIT 100
    `;
    return Response.json({ users: rows as User[] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return Response.json({ users: [], error: message });
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const action = String(body.action || "");

  if (action === "switch") {
    const userId = String(body.userId || "").trim();
    if (!userId) {
      return Response.json({ error: "Missing userId" }, { status: 400 });
    }
    const sql = database();
    const rows =
      await sql`SELECT id, name, email, role FROM users WHERE id = ${userId}`;
    if (!rows.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    await createSession(userId);
    return Response.json({ ok: true, user: rows[0] as User });
  }

  if (action === "quick-create") {
    const role = body.role === "teacher" ? "teacher" : "student";
    const num = randomInt(10, 99);
    const name =
      String(body.name || "").trim() ||
      (role === "teacher" ? `ครูทดสอบ ${num}` : `นักเรียนทดสอบ ${num}`);
    const email =
      String(body.email || "").trim() ||
      `${role}${randomInt(100, 999)}@test.local`;
    const password = String(body.password || "password123");
    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    const sql = database();

    await sql`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (${id}, ${name}, ${email}, ${passwordHash}, ${role})
    `;

    const user: User = { id, name, email, role };
    if (body.autoLogin) {
      await createSession(id);
    }

    return Response.json(
      {
        ok: true,
        user,
        defaultPassword: password,
      },
      { status: 201 },
    );
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
