import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { database } from "@/shared/server/database";
import { normalizeEmail } from "@/features/classroom/domain/roster-parser";
import { randomBytes, createHash } from "node:crypto";

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

  const code = requestUrl.searchParams.get("code");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? "/classrooms";

  if (errorParam) {
    console.error(
      "[auth/callback] OAuth provider returned error:",
      errorParam,
      errorDescription,
    );
    const msg = errorDescription || errorParam;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, origin),
    );
  }

  if (code) {
    const cookieStore = await cookies();
    const cookiesToSet: {
      name: string;
      value: string;
      options: CookieOptions;
    }[] = [];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    if (!supabaseUrl || !supabaseKey) {
      console.error("[auth/callback] Missing Supabase URL or Key");
      return NextResponse.redirect(
        new URL(
          "/login?error=" +
            encodeURIComponent(
              "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL หรือ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ใน .env.local",
            ),
          origin,
        ),
      );
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Ignore if called in environment where cookies can't be set directly
            }
            cookiesToSet.push({ name, value, options });
          });
        },
      },
    });

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error(
        "[auth/callback] exchangeCodeForSession failed:",
        exchangeError,
      );
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            exchangeError.message || "auth_failed",
          )}`,
          origin,
        ),
      );
    }

    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.error("[auth/callback] DATABASE_URL is empty in .env.local");
      const res = NextResponse.redirect(
        new URL(
          "/login?error=" +
            encodeURIComponent(
              "ยังไม่ได้ตั้งค่า DATABASE_URL ใน .env.local (กรุณาระบุ Connection string จาก Supabase Database Settings > Database)",
            ),
          origin,
        ),
      );
      cookiesToSet.forEach(({ name, value, options }) => {
        res.cookies.set(name, value, options);
      });
      return res;
    }

    try {
      const {
        data: { user: sbUser },
      } = await supabase.auth.getUser();

      if (sbUser && sbUser.email) {
        const email = normalizeEmail(sbUser.email);
        const sql = database();
        const rows =
          await sql`SELECT id, name, email, role FROM users WHERE email = ${email}`;

        let targetUrl = "/auth/complete-profile";
        let sessionToken: string | null = null;

        if (rows.length > 0) {
          // User already exists! Create session token and redirect to /classrooms
          targetUrl = next;
          const token = randomBytes(32).toString("hex");
          const userId = String(rows[0].id);
          await sql`INSERT INTO sessions(token_hash, user_id, expires_at) VALUES(${hashToken(token)}, ${userId}, now() + interval '7 days')`;
          sessionToken = token;
        }

        const response = NextResponse.redirect(
          new URL(targetUrl, origin),
        );

        // Crucial: Transfer Supabase auth cookies onto the response object
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        // Set session cookie if existing user
        if (sessionToken) {
          response.cookies.set("pair_session", sessionToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
          });
        }

        return response;
      }
    } catch (dbError) {
      console.error("[auth/callback] Database query error:", dbError);
      const res = NextResponse.redirect(
        new URL(
          "/login?error=" +
            encodeURIComponent(
              "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาตรวจสอบ DATABASE_URL ใน .env.local",
            ),
          origin,
        ),
      );
      cookiesToSet.forEach(({ name, value, options }) => {
        res.cookies.set(name, value, options);
      });
      return res;
    }

    // Fallback if no user email
    const response = NextResponse.redirect(new URL(next, origin));
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  // If no code, redirect back to login
  return NextResponse.redirect(
    new URL(
      "/login?error=" +
        encodeURIComponent(
          "ไม่พบรหัสยืนยันจาก Google OAuth (กรุณาตรวจสอบว่าได้เปิดใช้งาน Google Provider ใน Supabase และระบุ Redirect URLs ถูกต้อง)",
        ),
      origin,
    ),
  );
}
