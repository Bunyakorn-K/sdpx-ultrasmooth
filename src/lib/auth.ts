// Managed Better Auth owns production identity. The legacy cookie is accepted
// only when explicitly enabled for isolated, non-production regression tests.
import { cookies } from "next/headers";
import { eq, and } from "drizzle-orm";

import { db } from "#/db/client";
import { classroomMembers, users } from "#/db/schema";
import { accountRole, devAuthEnabled, type AccountRole } from "#/lib/auth-policy";

export const SESSION_COOKIE = "pe_uid";

export interface CurrentUser {
  id: number;
  emailNormalized: string;
  displayName: string | null;
  role: AccountRole;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!devAuthEnabled()) {
    const { getAuth } = await import("#/lib/neon-auth");
    const auth = getAuth();
    if (!auth) return null;
    try {
      const { data, error } = await auth.getSession();
      if (error || !data?.user) return null;
      const { resolveAuthUser } = await import("#/services/auth-user-service");
      const user = await resolveAuthUser(data.user);
      return user ? {
        id: user.id, emailNormalized: user.emailNormalized,
        displayName: user.displayName, role: accountRole(data.user.id),
      } : null;
    } catch {
      // SQL errors may embed identity data. Fail closed without logging them.
      return null;
    }
  }
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const userId = raw ? Number(raw) : NaN;
  if (!Number.isInteger(userId)) return null;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;

  const memberships = await db.select({ role: classroomMembers.role }).from(classroomMembers)
    .where(eq(classroomMembers.userId, user.id));
  const fixtureRole = memberships.length === 0 || memberships.some((member) => member.role === "INSTRUCTOR")
    ? "teacher" : "student";
  return { id: user.id, emailNormalized: user.emailNormalized, displayName: user.displayName, role: fixtureRole };
}

export type ClassroomRole = "INSTRUCTOR" | "STUDENT";

export async function getClassroomRole(
  classroomId: number,
  userId: number,
): Promise<ClassroomRole | null> {
  const [member] = await db
    .select({ role: classroomMembers.role, authSubject: users.authSubject })
    .from(classroomMembers)
    .innerJoin(users, eq(users.id, classroomMembers.userId))
    .where(and(eq(classroomMembers.classroomId, classroomId), eq(classroomMembers.userId, userId)));

  if (member?.role === "INSTRUCTOR" && !devAuthEnabled() && accountRole(member.authSubject ?? "") !== "teacher") return null;
  return member?.role ?? null;
}

export function normalizeEmail(rawEmail: string): string {
  // University mailboxes may distinguish dots and plus tags.
  return rawEmail.trim().toLowerCase();
}
