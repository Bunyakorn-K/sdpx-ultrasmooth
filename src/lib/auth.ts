// TEMPORARY: dev-only stub auth. No Google OAuth / Supabase credentials are
// configured yet, so identity is just a cookie holding a user id. Replace
// with Better Auth (see AGENTS.md target architecture) once credentials
// exist — getCurrentUser()/getClassroomRole() are the only two functions
// the rest of the app depends on, so that swap should be contained here.
import { cookies } from "next/headers";
import { eq, and } from "drizzle-orm";

import { db } from "#/db/client";
import { classroomMembers, users } from "#/db/schema";

export const SESSION_COOKIE = "pe_uid";

export interface CurrentUser {
  id: number;
  emailNormalized: string;
  displayName: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const userId = raw ? Number(raw) : NaN;
  if (!Number.isInteger(userId)) return null;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;

  return { id: user.id, emailNormalized: user.emailNormalized, displayName: user.displayName };
}

export type ClassroomRole = "INSTRUCTOR" | "STUDENT";

export async function getClassroomRole(
  classroomId: number,
  userId: number,
): Promise<ClassroomRole | null> {
  const [member] = await db
    .select({ role: classroomMembers.role })
    .from(classroomMembers)
    .where(and(eq(classroomMembers.classroomId, classroomId), eq(classroomMembers.userId, userId)));

  return member?.role ?? null;
}

export function normalizeEmail(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase();
  const [local, domain] = email.split("@");
  if (!domain) return email;

  // Gmail-style normalization (drop dots and +tag in the local part) — good
  // enough for a dev stub; a real IdP-backed implementation would use
  // whatever normalization matches the university's mail provider.
  const normalizedLocal = local.split("+")[0].replace(/\./g, "");
  return `${normalizedLocal}@${domain}`;
}
