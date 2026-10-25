import { makeAssignment, makeUser } from "../factories";
import { FakeAssignmentRepository } from "./fake-assignment-repository";
import { RawExportService } from "@/features/assignments/server/raw-export-service";
import type { CreateAuditEntryInput } from "@/features/audit/types";
import type { ClassroomRepository } from "@/features/classroom/server/classroom-repository";

export function rawExportFixture(classrooms?: ClassroomRepository) {
  const teacher = makeUser({ role: "teacher" });
  const student = makeUser({
    name: "Private Evaluator",
    email: "private@example.test",
  });
  const assignment = makeAssignment({
    ownerId: teacher.id,
    status: "closed",
    students: [{ id: student.id, name: student.name }],
    pairGeneration: 2,
  });
  const pair = {
    id: `pair-${student.id}`,
    assignment_id: assignment.id,
    criterion_id: "GROUP-0",
    side: "GROUP" as const,
    item_a_id: "group-a",
    item_b_id: "group-b",
    evaluator_user_id: student.id,
    display_left_item_id: "group-b",
    generation: 2,
    source: "AUTO" as const,
    created_at: assignment.createdAt,
  };
  assignment.pairs = [pair];
  assignment.comparisons = [
    {
      id: `response-${student.id}`,
      pair_assignment_id: pair.id,
      evaluator_user_id: student.id,
      choice: 6,
      status: "SUBMITTED",
      saved_at: assignment.createdAt,
      submitted_at: assignment.createdAt,
      time_on_task_ms: 5000,
    },
    {
      id: "draft",
      pair_assignment_id: pair.id,
      evaluator_user_id: student.id,
      choice: 2,
      status: "DRAFT",
      saved_at: assignment.createdAt,
    },
    {
      id: "excluded",
      pair_assignment_id: pair.id,
      evaluator_user_id: student.id,
      choice: 3,
      status: "EXCLUDED",
      saved_at: assignment.createdAt,
    },
    {
      id: "archived",
      pair_assignment_id: "old-pair",
      evaluator_user_id: student.id,
      choice: 1,
      status: "SUBMITTED",
      saved_at: assignment.createdAt,
    },
  ];
  const repository = new FakeAssignmentRepository([assignment]);
  const audits: CreateAuditEntryInput[] = [];
  const lookups: string[][] = [];
  const audit = {
    record: async (input: CreateAuditEntryInput) => {
      audits.push(input);
      return {
        ...input,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
    },
  };
  const identities = {
    findByIds: async (ids: string[]) => {
      lookups.push(ids);
      return [{ id: student.id, name: student.name, email: student.email }];
    },
  };
  const service = new RawExportService(
    repository,
    identities,
    audit,
    classrooms,
  );
  return {
    teacher,
    student,
    assignment,
    pair,
    repository,
    audits,
    audit,
    lookups,
    identities,
    service,
  };
}
