import { NextResponse, type NextRequest } from "next/server";
import { devAuthEnabled } from "#/lib/auth-policy";
import { getAuth } from "#/lib/neon-auth";

export default async function proxy(request: NextRequest) {
  if (devAuthEnabled()) return NextResponse.next();
  const auth = getAuth();
  if (!auth) return NextResponse.redirect(new URL("/sign-in", request.url));
  return auth.middleware({ loginUrl: "/sign-in" })(request);
}

export const config = { matcher: ["/classrooms/:path*"] };
