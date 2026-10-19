import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db/client";
import { users } from "#/db/schema";
import { normalizeEmail } from "#/lib/auth";

export async function resolveAuthUser(identity: {
  id: string; email: string; name: string; emailVerified: boolean;
}) {
  const emailNormalized = normalizeEmail(identity.email);
  await db.insert(users).values({ authSubject: identity.id, emailNormalized,
    emailRaw: identity.email, displayName: identity.name, status: "ACTIVE" })
    .onConflictDoNothing();

  // Imported roster accounts can be claimed only by a verified email identity.
  // A new, unverified signup must never inherit an existing user's permissions.
  if (identity.emailVerified) {
    await db.update(users).set({ authSubject: identity.id, status: "ACTIVE" })
      .where(and(eq(users.emailNormalized, emailNormalized), isNull(users.authSubject)));
  }
  const [user] = await db.select().from(users).where(eq(users.authSubject, identity.id));
  return user ?? null;
}
