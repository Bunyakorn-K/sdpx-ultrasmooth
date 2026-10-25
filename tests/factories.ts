import { randomUUID } from "node:crypto";
import type { User } from "@/features/auth/types";
import type { Assignment } from "@/features/assignments/types";

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: randomUUID(),
    name: "Test Student",
    email: `${randomUUID()}@example.invalid`,
    role: "student",
    ...overrides,
  };
}
export function makeAssignment(
  overrides: Partial<Assignment> = {},
): Assignment {
  return {
    id: randomUUID(),
    ownerId: randomUUID(),
    title: "Peer review",
    description: "Fixture for peer evaluation",
    subject: "Technology",
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: "draft",
    questions: ["Content", "Creativity"],
    groups: [],
    students: [],
    votes: [],
    createdAt: new Date().toISOString(),
    color: "mint",
    ...overrides,
  };
}
export function makeVotingFixture() {
  const teacher = makeUser({ role: "teacher" });
  const student = makeUser();
  const other = makeUser();
  const assignment = makeAssignment({
    ownerId: teacher.id,
    status: "active",
    students: [student, other].map(({ id, name }) => ({ id, name })),
    groups: [
      {
        id: randomUUID(),
        name: "One",
        members: [{ id: student.id, name: student.name }],
      },
      {
        id: randomUUID(),
        name: "Two",
        members: [{ id: other.id, name: other.name }],
      },
    ],
  });
  return { teacher, student, other, assignment };
}
