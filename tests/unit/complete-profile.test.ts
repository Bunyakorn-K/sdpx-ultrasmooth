import test from "node:test";
import assert from "node:assert/strict";
import { completeProfileResponse } from "@/features/auth/server/http-handlers";

test("complete-profile: rejects empty name or invalid role with 400", async () => {
  const reqInvalidName = new Request(
    "http://localhost/api/auth/complete-profile",
    {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "", role: "student" }),
    },
  );

  const res1 = await completeProfileResponse(reqInvalidName);
  assert.equal(res1.status, 400);
  const body1 = await res1.json();
  assert.match(body1.error, /กรุณากรอกชื่อที่แสดง/);

  const reqInvalidRole = new Request(
    "http://localhost/api/auth/complete-profile",
    {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Somchai", role: "admin" }),
    },
  );

  const res2 = await completeProfileResponse(reqInvalidRole);
  assert.equal(res2.status, 400);
  const body2 = await res2.json();
  assert.match(body2.error, /กรุณาเลือกบทบาท/);
});

test("complete-profile: rejects when supabase is not configured or unauthenticated", async () => {
  const req = new Request("http://localhost/api/auth/complete-profile", {
    method: "POST",
    headers: {
      origin: "http://localhost",
      "content-type": "application/json",
    },
    body: JSON.stringify({ name: "Somchai", role: "teacher" }),
  });

  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const res503 = await completeProfileResponse(req);
    assert.equal(res503.status, 503);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-anon-key";
    const res401 = await completeProfileResponse(
      new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify({ name: "Somchai", role: "teacher" }),
      }),
    );
    assert.equal(res401.status, 401);
  } finally {
    if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (originalKey)
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    else delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});
