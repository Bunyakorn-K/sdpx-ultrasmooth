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

test("FR-AUTH-03: AuthService normalizes emails across dots and tags on login/register", async () => {
  let savedUser: any = null;
  const repository = {
    create: async (u: any, hash: string) => {
      savedUser = { ...u, password_hash: hash };
      return u;
    },
    findByEmail: async (email: string) => {
      if (savedUser && savedUser.email === email) return savedUser;
      return null;
    },
  };
  const auth = new AuthService(repository);

  // Register with Somchai.A+x@uni.ac.th
  const registered = await auth.authenticate({
    action: "register",
    name: "Somchai A",
    email: "Somchai.A+x@uni.ac.th",
    password: "password123",
    role: "student",
  });
  assert.equal(registered.email, "somchaia@uni.ac.th");

  // Login with somchaia@uni.ac.th
  const loggedIn = await auth.authenticate({
    action: "login",
    email: "somchaia@uni.ac.th",
    password: "password123",
  });
  assert.equal(loggedIn.id, registered.id);
});
