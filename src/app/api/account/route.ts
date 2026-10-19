import { getCurrentUser } from "#/lib/auth";
import { unauthorized } from "#/lib/api-error";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return Response.json({ user: { name: user.displayName, role: user.role } },
    { headers: { "Cache-Control": "no-store" } });
}
