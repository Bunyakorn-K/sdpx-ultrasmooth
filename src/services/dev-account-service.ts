import { eq } from "drizzle-orm";
import { db } from "#/db/client";
import { classroomMembers, classrooms, users } from "#/db/schema";
import { devAuthEnabled, type AccountRole } from "#/lib/auth-policy";

export async function getDevAccount(role: AccountRole) {
  if (!devAuthEnabled()) throw new Error("Development accounts are disabled.");
  return db.transaction(async (tx) => {
    // Unique keys make repeated clicks and concurrent first logins safe.
    const accounts = await tx.insert(users).values([
      { emailNormalized: "teacher@paireval.test", emailRaw: "teacher@paireval.test", displayName: "Demo Teacher", status: "ACTIVE" as const },
      { emailNormalized: "student@paireval.test", emailRaw: "student@paireval.test", displayName: "Demo Student", status: "ACTIVE" as const },
    ]).onConflictDoUpdate({ target: users.emailNormalized, set: { status: "ACTIVE", lastLoginAt: new Date() } }).returning();
    const teacher = accounts.find((user) => user.emailNormalized === "teacher@paireval.test")!;
    const student = accounts.find((user) => user.emailNormalized === "student@paireval.test")!;
    const [classroom] = await tx.insert(classrooms).values({
      name: "Development classroom", slug: "paireval-dev", createdBy: teacher.id,
    }).onConflictDoUpdate({ target: classrooms.slug, set: { name: "Development classroom" } }).returning();
    await tx.insert(classroomMembers).values([
      { classroomId: classroom.id, userId: teacher.id, role: "INSTRUCTOR" as const },
      { classroomId: classroom.id, userId: student.id, role: "STUDENT" as const },
    ]).onConflictDoNothing();
    const user = role === "teacher" ? teacher : student;
    await tx.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    return user;
  });
}

/**
 * Dev auth derives the role from memberships, so a brand-new account is a
 * teacher. Enrolling it as a student in the development classroom lets local
 * and e2e runs create many students that can then join assignments by code.
 */
export async function makeDevStudent(userId: number) {
  if (!devAuthEnabled()) throw new Error("Development accounts are disabled.");
  await getDevAccount("student");
  const [classroom] = await db.select({ id: classrooms.id }).from(classrooms).where(eq(classrooms.slug, "paireval-dev"));
  await db.insert(classroomMembers).values({ classroomId: classroom.id, userId, role: "STUDENT" }).onConflictDoNothing();
}
