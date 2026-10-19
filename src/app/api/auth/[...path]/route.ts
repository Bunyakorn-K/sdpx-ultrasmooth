import type { NextRequest } from "next/server";
import { getAuth } from "#/lib/neon-auth";

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const auth = getAuth();
  if (!auth) return Response.json({ error: { message: "Authentication is not configured." } }, { status: 503 });
  const handlers = auth.handler();
  const method = request.method as keyof typeof handlers;
  try {
    return await handlers[method](request, context);
  } catch {
    return Response.json({ error: { message: "Authentication is temporarily unavailable." } }, { status: 502 });
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
