import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "#/db/client";
import { users } from "#/db/schema";
import { normalizeEmail } from "#/lib/auth";

// "Last active" only needs coarse precision; refreshing it at most this often
// keeps the common request path to a single read.
const LAST_ACTIVE_REFRESH_MS = 15 * 60 * 1000;

export async function resolveAuthUser(identity: {
  id: string; email: string; name: string; emailVerified: boolean;
}) {
  // This runs on every authenticated request. A linked identity is the common
  // case and needs one read (plus a throttled last-active write); the writes
  // after that are only for first sign-in.
  const [linked] = await db.select().from(users).where(eq(users.authSubject, identity.id));
  if (linked) {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - LAST_ACTIVE_REFRESH_MS);
    if (!linked.lastLoginAt || linked.lastLoginAt < staleBefore) {
      await db.update(users).set({ lastLoginAt: now })
        .where(and(eq(users.id, linked.id), or(isNull(users.lastLoginAt), lt(users.lastLoginAt, staleBefore))));
      return { ...linked, lastLoginAt: now };
    }
    return linked;
  }

  const emailNormalized = normalizeEmail(identity.email);
  await db.insert(users).values({ authSubject: identity.id, emailNormalized,
    emailRaw: identity.email, displayName: identity.name, status: "ACTIVE", lastLoginAt: new Date() })
    .onConflictDoNothing();

  // Imported roster accounts can be claimed only by a verified email identity.
  // A new, unverified signup must never inherit an existing user's permissions.
  if (identity.emailVerified) {
    await db.update(users).set({ authSubject: identity.id, status: "ACTIVE", lastLoginAt: new Date() })
      .where(and(eq(users.emailNormalized, emailNormalized), isNull(users.authSubject)));
  }
  const [user] = await db.select().from(users).where(eq(users.authSubject, identity.id));
  return user ?? null;
}
