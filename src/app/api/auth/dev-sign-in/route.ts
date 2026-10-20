// TEMPORARY: dev-only stub auth — see src/lib/auth.ts.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { apiError } from "#/lib/api-error";
import { SESSION_COOKIE } from "#/lib/auth";
import { activateUserOnSignIn } from "#/services/user-service";
import { devAuthEnabled } from "#/lib/auth-policy";
import { getDevAccount, makeDevStudent } from "#/services/dev-account-service";

export async function POST(request: Request) {
  if (!devAuthEnabled()) return new Response(null, { status: 404 });
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() || null : null;

  const demoRole = body?.demoRole;
  if (demoRole !== undefined && demoRole !== "teacher" && demoRole !== "student") {
    return apiError(400, "INVALID_BODY", "Unknown development account.");
  }
  // `role: "student"` with an email seeds an extra student account.
  const asStudent = body?.role === "student";
  if (!email && !demoRole) {
    return apiError(400, "INVALID_BODY", "email is required.");
  }

  const user = await (demoRole ? getDevAccount(demoRole) : activateUserOnSignIn(email, displayName).then(async (account) => {
    if (asStudent) await makeDevStudent(account.id);
    return account;
  })).catch(() => null);
  if (!user) return apiError(503, "DEV_DATABASE_UNAVAILABLE", "Start the development database and run migrations before signing in.");

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, String(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // FR-AUTH-04's 12h session lifetime (this stub never silently refreshes it)
  });

  return NextResponse.json({ userId: user.id, displayName: user.displayName });
}
