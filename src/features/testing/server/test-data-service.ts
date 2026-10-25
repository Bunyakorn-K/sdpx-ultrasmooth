import { hashPassword } from "@/features/auth/server/password-service";
import { database } from "@/shared/server/database";
import { AppError } from "@/shared/domain/app-error";
import { createHash } from "node:crypto";
import { requireResourceId } from "@/shared/server/http";
export async function seedTestRun(input: Record<string, unknown>) {
  const runId = requireResourceId(String(input.runId || ""));
  if (
    !Array.isArray(input.users) ||
    input.users.length < 1 ||
    input.users.length > 5
  )
    throw new AppError("Invalid seed");
  const users = input.users.map((user) => {
    if (!user || typeof user !== "object") throw new AppError("Invalid user");
    const record = user as Record<string, unknown>;
    const id = requireResourceId(String(record.id || ""));
    const email = String(record.email || "");
    const password = String(record.password || "");
    const name = String(record.name || "");
    const role = String(record.role);
    if (
      !email.endsWith("@e2e.invalid") ||
      !name ||
      password.length < 8 ||
      password.length > 128 ||
      !["teacher", "student"].includes(role)
    )
      throw new AppError("Invalid seed account");
    return { id, email, password, name, role };
  });
  const sql = database();
  await sql`INSERT INTO e2e_test_runs(run_id,user_ids) VALUES(${runId},${JSON.stringify(users.map((user) => user.id))}::jsonb)`;
  try {
    for (const user of users)
      await sql`INSERT INTO users(id,name,email,password_hash,role) VALUES(${user.id},${user.name},${user.email},${await hashPassword(user.password)},${user.role})`;
  } catch (error) {
    await cleanupTestRun(runId);
    throw error;
  }
  return { runId };
}
export async function cleanupTestRun(
  runId: string,
  additionalUserIds: unknown = [],
) {
  requireResourceId(runId);
  const sql = database();
  if (!Array.isArray(additionalUserIds) || additionalUserIds.length > 5)
    throw new AppError("Invalid cleanup accounts");
  for (const value of additionalUserIds) {
    const id = requireResourceId(String(value));
    const accounts =
      await sql`SELECT id FROM users WHERE id=${id} AND email LIKE ${"%@e2e.invalid"}`;
    if (accounts.length)
      await sql`UPDATE e2e_test_runs SET user_ids=user_ids||${JSON.stringify([id])}::jsonb WHERE run_id=${runId}`;
  }
  const users =
    await sql`SELECT email FROM users WHERE id IN (SELECT jsonb_array_elements_text(user_ids)::uuid FROM e2e_test_runs WHERE run_id=${runId})`;
  const pending =
    await sql`SELECT DISTINCT u.id FROM users u JOIN classrooms c ON c.data->'members' @> jsonb_build_array(jsonb_build_object('user_id',u.id::text)) WHERE u.password_hash='!roster-pending' AND c.owner_id IN (SELECT jsonb_array_elements_text(user_ids)::uuid FROM e2e_test_runs WHERE run_id=${runId})`;
  await sql`DELETE FROM audit_logs WHERE actor_id IN (SELECT jsonb_array_elements_text(user_ids)::uuid FROM e2e_test_runs WHERE run_id=${runId})`;
  await sql`DELETE FROM assignments WHERE owner_id IN (SELECT jsonb_array_elements_text(user_ids)::uuid FROM e2e_test_runs WHERE run_id=${runId})`;
  await sql`DELETE FROM classrooms WHERE owner_id IN (SELECT jsonb_array_elements_text(user_ids)::uuid FROM e2e_test_runs WHERE run_id=${runId})`;
  for (const account of pending) {
    await sql`DELETE FROM users WHERE id=${String(account.id)} AND password_hash='!roster-pending' AND NOT EXISTS (SELECT 1 FROM classrooms WHERE data->'members' @> jsonb_build_array(jsonb_build_object('user_id',users.id::text))) AND NOT EXISTS (SELECT 1 FROM assignments WHERE data->'students' @> jsonb_build_array(jsonb_build_object('id',users.id::text)))`;
  }
  await sql`DELETE FROM users WHERE id IN (SELECT jsonb_array_elements_text(user_ids)::uuid FROM e2e_test_runs WHERE run_id=${runId})`;
  for (const user of users) {
    const bucket = createHash("sha256")
      .update(String(user.email).toLowerCase())
      .digest("hex");
    await sql`DELETE FROM auth_rate_limits WHERE bucket=${bucket}`;
  }
  await sql`DELETE FROM e2e_test_runs WHERE run_id=${runId}`;
}
