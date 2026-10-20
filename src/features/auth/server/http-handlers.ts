import { AppError } from "@/shared/domain/app-error";
import {
  readJsonObject,
  requireSameOrigin,
  withApi,
} from "@/shared/server/http";
import { logBusinessEvent } from "@/shared/server/logger";
import { AuthService } from "./auth-service";
import { limitAuthAttempts } from "./auth-rate-limiter";
import { createSession, currentUser, revokeSession } from "./session-service";
import { PostgresUserRepository } from "./user-repository";
import { createClient } from "@/shared/lib/supabase/server";
import { database } from "@/shared/server/database";
import { normalizeEmail } from "@/features/classroom/domain/roster-parser";
import type { User } from "../types";

const service = new AuthService(new PostgresUserRepository());

export const sessionResponse = withApi("/api/auth", async () => {
  const user = await currentUser();
  let pendingGoogleUser: { email: string; name: string } | null = null;

  if (
    !user &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    try {
      const supabase = await createClient();
      const {
        data: { user: sbUser },
      } = await supabase.auth.getUser();
      if (sbUser?.email) {
        pendingGoogleUser = {
          email: sbUser.email,
          name:
            (sbUser.user_metadata?.full_name as string) ||
            (sbUser.user_metadata?.name as string) ||
            sbUser.email.split("@")[0] ||
            "",
        };
      }
    } catch {
      // ignore
    }
  }

  return Response.json({
    user,
    configured:
      !!process.env.DATABASE_URL ||
      !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      ),
    pendingGoogleUser,
  });
});

export function authResponse(mode?: "login" | "register" | "logout") {
  return withApi(
    mode ? `/api/auth/${mode}` : "/api/auth",
    async (request, context) => {
      const start = performance.now();
      requireSameOrigin(request);
      const input = await readJsonObject(request);
      const action = mode || input.action;
      if (action === "logout") {
        await revokeSession();
        logBusinessEvent("user_logged_out", context, performance.now() - start);
        return Response.json({ ok: true });
      }
      if (action !== "login" && action !== "register")
        throw new AppError("คำขอไม่ถูกต้อง");
      await limitAuthAttempts(input.email);
      const user = await service.authenticate({ ...input, action });
      await createSession(user.id);
      context.userId = user.id;
      logBusinessEvent(
        action === "register" ? "user_registered" : "user_logged_in",
        context,
        performance.now() - start,
      );
      return Response.json(
        { user },
        { status: action === "register" ? 201 : 200 },
      );
    },
  );
}

export const completeProfileResponse = withApi(
  "/api/auth/complete-profile",
  async (request, context) => {
    const start = performance.now();
    requireSameOrigin(request);
    const input = await readJsonObject(request);
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const role = input.role;

    if (!name || name.length > 100) {
      throw new AppError("กรุณากรอกชื่อที่แสดง (ความยาว 1-100 ตัวอักษร)", 400);
    }
    if (role !== "teacher" && role !== "student") {
      throw new AppError("กรุณาเลือกบทบาท (คุณครู หรือ นักเรียน)", 400);
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
    ) {
      throw new AppError("ยังไม่ได้ตั้งค่าระบบ Supabase", 503);
    }

    const supabase = await createClient();
    const {
      data: { user: sbUser },
    } = await supabase.auth.getUser();

    if (!sbUser || !sbUser.email) {
      throw new AppError("กรุณาเข้าสู่ระบบด้วย Google ก่อนดำเนินการ", 401);
    }

    const email = normalizeEmail(sbUser.email);
    const sql = database();

    let rows =
      await sql`SELECT id, name, email, role FROM users WHERE email = ${email}`;

    if (rows.length > 0) {
      rows = await sql`
        UPDATE users SET name = ${name}, role = ${role}
        WHERE email = ${email}
        RETURNING id, name, email, role
      `;
    } else {
      rows = await sql`
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (${sbUser.id}, ${name}, ${email}, ${"!supabase-auth"}, ${role})
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
        RETURNING id, name, email, role
      `;
    }

    const user = rows[0] as User;
    await createSession(user.id);
    context.userId = user.id;

    logBusinessEvent("user_registered", context, performance.now() - start);
    return Response.json({ ok: true, user });
  },
);
