import { eq } from "drizzle-orm";

import { db, type DbClient } from "#/db/client";
import { users } from "#/db/schema";
import { normalizeEmail } from "#/lib/auth";

export async function findOrCreateUser(
  emailRaw: string,
  displayName: string | null = null,
  database: DbClient = db,
) {
  const emailNormalized = normalizeEmail(emailRaw);
  const [existing] = await database.select().from(users).where(eq(users.emailNormalized, emailNormalized));
  if (existing) return existing;

  const [created] = await database
    .insert(users)
    .values({ emailNormalized, emailRaw, displayName, status: "PENDING" })
    .returning();
  return created;
}

// FR-CLASS-04: a roster row creates a PENDING user; the first real sign-in
// activates it.
export async function activateUserOnSignIn(emailRaw: string, displayName: string | null = null) {
  const user = await findOrCreateUser(emailRaw, displayName);
  const [updated] = await db
    .update(users)
    .set({ status: "ACTIVE", lastLoginAt: new Date(), displayName: user.displayName ?? displayName })
    .where(eq(users.id, user.id))
    .returning();
  return updated;
}
