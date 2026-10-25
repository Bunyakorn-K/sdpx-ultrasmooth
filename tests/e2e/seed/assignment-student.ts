import type { APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";
import { PostgresAssignmentRepository } from "@/features/assignments/server/assignment-repository";
import { requireTestEnvironment } from "@/shared/server/test-environment";
import type { User } from "@/features/auth/types";

/** Prepare legacy fixtures directly; production enrollment is Classroom CSV only. */
export async function seedAssignmentStudent(
  id: string,
  api: APIRequestContext,
) {
  requireTestEnvironment(
    new Request("http://localhost/", {
      headers: { "x-test-token": process.env.E2E_SEED_TOKEN || "" },
    }),
    { ...process.env, E2E_TEST_MODE: process.env.E2E_DATABASE_ENABLED },
  );
  const session = await api.get("/api/auth");
  expect(session.status()).toBe(200);
  const { user } = (await session.json()) as { user: User };
  expect(user.role).toBe("student");
  const repository = new PostgresAssignmentRepository();
  const record = await repository.findById(id);
  expect(record).not.toBeNull();
  if (!record!.assignment.students.some((s) => s.id === user.id)) {
    record!.assignment.students.push({ id: user.id, name: user.name });
    expect(await repository.update(record!.assignment, record!.version)).toBe(
      true,
    );
  }
  return api.get(`/api/assignments/${id}`);
}
