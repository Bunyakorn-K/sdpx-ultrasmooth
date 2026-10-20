import { createHash } from "node:crypto";
import { AppError } from "@/shared/domain/app-error";
import { database } from "@/shared/server/database";
const MAX_ATTEMPTS = 10;
/** Database-backed limit remains effective across server instances. Never store raw emails here. */
export async function limitAuthAttempts(email: unknown) {
  const bucket = createHash("sha256")
    .update(
      String(email || "")
        .trim()
        .toLowerCase(),
    )
    .digest("hex");
  const sql = database();
  const rows =
    await sql`INSERT INTO auth_rate_limits(bucket,attempts,reset_at) VALUES(${bucket},1,now()+interval '15 minutes') ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN auth_rate_limits.reset_at<=now() THEN 1 ELSE auth_rate_limits.attempts+1 END, reset_at=CASE WHEN auth_rate_limits.reset_at<=now() THEN now()+interval '15 minutes' ELSE auth_rate_limits.reset_at END RETURNING attempts`;
  if (Number(rows[0].attempts) > MAX_ATTEMPTS)
    throw new AppError("พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที", 429);
}
