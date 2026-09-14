// TEMPORARY: dev-only stub auth — see src/lib/auth.ts.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { apiError } from "#/lib/api-error";
import { SESSION_COOKIE } from "#/lib/auth";
import { activateUserOnSignIn } from "#/services/user-service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() || null : null;

  if (!email) {
    return apiError(400, "INVALID_BODY", "email is required.");
  }

  const user = await activateUserOnSignIn(email, displayName);

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
