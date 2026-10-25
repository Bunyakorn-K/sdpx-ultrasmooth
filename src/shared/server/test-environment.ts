import { timingSafeEqual } from "node:crypto";
import { AppError } from "@/shared/domain/app-error";

export function requireTestEnvironment(
  request: Request,
  environment: Record<string, string | undefined> = process.env,
) {
  const expected = environment.E2E_SEED_TOKEN || "";
  const supplied = request.headers.get("x-test-token") || "";
  let testDatabase = false;
  try {
    testDatabase = new URL(environment.DATABASE_URL || "").pathname.endsWith(
      "_test",
    );
  } catch {
    /* Invalid configuration is denied. */
  }
  if (
    environment.NODE_ENV === "production" ||
    environment.E2E_TEST_MODE !== "1" ||
    environment.DATABASE_DRIVER !== "postgres" ||
    !testDatabase ||
    expected.length < 32 ||
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    throw new AppError("Not found", 404);
}
