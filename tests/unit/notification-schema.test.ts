import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { NotificationKind } from "@/features/notifications/types";

test("fresh and upgraded databases accept every persisted notification kind", async () => {
  const schema = await readFile(
    new URL("../../scripts/schema.sql", import.meta.url),
    "utf8",
  );
  const constraints = [
    ...schema.matchAll(
      /notifications_kind_check CHECK\(kind IN \(([^)]+)\)\)/g,
    ),
  ];
  assert.equal(
    constraints.length,
    2,
    "both CREATE TABLE and ALTER TABLE must define the constraint",
  );
  const expected = Object.keys({
    assignment_opened: true,
    deadline_reminder: true,
    results_finalized: true,
    pairs_regenerated: true,
    additional_evaluation: true,
  } satisfies Record<NotificationKind, true>).sort();
  for (const constraint of constraints) {
    const accepted = [...constraint[1].matchAll(/'([^']+)'/g)]
      .map((match) => match[1])
      .sort();
    assert.deepEqual(
      accepted,
      expected,
      "database notification kinds must match the application contract",
    );
  }
});
