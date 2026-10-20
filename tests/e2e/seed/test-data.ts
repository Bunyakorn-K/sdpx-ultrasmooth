import { randomBytes, randomUUID } from "node:crypto";
import type { User } from "@/features/auth/types";
export type SeedAccount = User & { password: string };
export type TestUsers = {
  runId: string;
  createdUserIds: string[];
  teacher: SeedAccount;
  student: SeedAccount;
  other: SeedAccount;
};
export function makeTestUsers(): TestUsers {
  const runId = randomUUID();
  const account = (role: User["role"], name: string): SeedAccount => ({
    id: randomUUID(),
    name,
    email: `${randomUUID()}@e2e.invalid`,
    role,
    password: randomBytes(24).toString("hex"),
  });
  return {
    runId,
    createdUserIds: [],
    teacher: account("teacher", "Test Teacher"),
    student: account("student", "Test Student"),
    other: account("student", "Other Student"),
  };
}
export function futureLocalDeadline() {
  const date = new Date(Date.now() + 7 * 86400000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
