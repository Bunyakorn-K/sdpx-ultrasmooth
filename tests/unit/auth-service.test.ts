import test from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "@/features/auth/server/auth-service";

test("auth: duplicate registration email returns 409 and unknown action throws", async () => {
  const repository = {
    create: async () => null, // simulates duplicate email
    findByEmail: async () => null,
  };
  const auth = new AuthService(repository);

  await assert.rejects(
    () =>
      auth.authenticate({
        action: "register",
        name: "Duplicate User",
        email: "existing@example.com",
        password: "password123",
        role: "student",
      }),
    /อีเมลนี้ถูกใช้งานแล้ว/,
  );

  await assert.rejects(
    () =>
      auth.authenticate({
        action: "unknown_action",
        email: "user@example.com",
        password: "password123",
      }),
    /คำขอไม่ถูกต้อง/,
  );
});
