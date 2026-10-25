import { expect } from "@playwright/test";
import { PostgresAssignmentRepository } from "@/features/assignments/server/assignment-repository";
import { requireTestEnvironment } from "@/shared/server/test-environment";

/** Explicitly prepare pre-pairwise data for legacy compatibility journeys. */
export async function prepareLegacyAssignment(id: string) {
  requireTestEnvironment(
    new Request("http://localhost/", {
      headers: { "x-test-token": process.env.E2E_SEED_TOKEN || "" },
    }),
    { ...process.env, E2E_TEST_MODE: process.env.E2E_DATABASE_ENABLED },
  );
  const repository = new PostgresAssignmentRepository();
  const record = await repository.findById(id);
  expect(record).not.toBeNull();
  delete record!.assignment.pairwiseRequired;
  expect(await repository.update(record!.assignment, record!.version)).toBe(
    true,
  );
}
