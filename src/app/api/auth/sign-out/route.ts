import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "#/lib/auth";
import { devAuthEnabled } from "#/lib/auth-policy";
import { getAuth } from "#/lib/neon-auth";

export async function POST() {
  if (!devAuthEnabled()) {
    const auth = getAuth();
    if (!auth) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    const { error } = await auth.signOut();
    return NextResponse.json({ ok: !error }, { status: error ? 502 : 200 });
  }
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
