import { AppError } from "@/shared/domain/app-error";
import { database } from "@/shared/server/database";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import type { User } from "../types";
import { createClient } from "@/shared/lib/supabase/server";
import { normalizeEmail } from "@/features/classroom/domain/roster-parser";

const SESSION_COOKIE = "pair_session";
// FR-AUTH-04: Session lifetime is 12 hours with silent renewal
const SESSION_DURATION = 12 * 60 * 60;
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function currentUser(): Promise<User | null> {
  // 1. Check Supabase Auth if configured
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    try {
      const supabase = await createClient();
      const {
        data: { user: sbUser },
      } = await supabase.auth.getUser();

      if (sbUser && sbUser.email) {
        const email = normalizeEmail(sbUser.email);
        const sql = database();
        const rows =
          await sql`SELECT id, name, email, role FROM users WHERE email=${email}`;
        if (rows.length > 0) {
          return rows[0] as User;
        }
      }
    } catch {
      // Fall through to cookie-based session
    }
  }

  // 2. Cookie session (for local database / tests / demo)
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const sql = database();
  const tokenHash = hashToken(token);
  const rows =
    await sql`SELECT u.id,u.name,u.email,u.role,s.expires_at FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=${tokenHash} AND s.expires_at > now()`;
  if (!rows.length) return null;
  const user = {
    id: rows[0].id,
    name: rows[0].name,
    email: rows[0].email,
    role: rows[0].role,
  } as User;

  // FR-AUTH-04 Silent Refresh: if session has less than 4 hours remaining, extend it quietly
  const expiresAt = new Date(rows[0].expires_at as string).getTime();
  if (expiresAt - Date.now() < 4 * 60 * 60 * 1000) {
    try {
      await sql`UPDATE sessions SET expires_at = now() + interval '12 hours' WHERE token_hash = ${tokenHash}`;
      (await cookies()).set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_DURATION,
      });
    } catch {
      // ignore
    }
  }

  return user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AppError("กรุณาเข้าสู่ระบบ", 401);
  return user;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const sql = database();
  await sql`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(${hashToken(token)},${userId},now()+interval '12 hours')`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function revokeSession() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const sql = database();
    await sql`DELETE FROM sessions WHERE token_hash=${hashToken(token)}`;
  }
  jar.delete(SESSION_COOKIE);
}
