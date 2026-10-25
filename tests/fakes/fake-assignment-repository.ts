import type { Assignment } from "@/features/assignments/types";
import type {
  AssignmentRecord,
  AssignmentRepository,
} from "@/features/assignments/server/assignment-repository";
import type { ClassroomRepository } from "@/features/classroom/server/classroom-repository";

export class FakeAssignmentRepository implements AssignmentRepository {
  private readonly records = new Map<string, AssignmentRecord>();

  constructor(
    assignments: Assignment[] = [],
    private readonly classroomRepo?: ClassroomRepository,
  ) {
    assignments.forEach((assignment) =>
      this.records.set(assignment.id, {
        assignment: structuredClone(assignment),
        version: 0,
      }),
    );
  }

  async listForUser(userId: string) {
    const userClassrooms = this.classroomRepo
      ? await this.classroomRepo.listForUser(userId)
      : [];
    const userClassroomIds = new Set(userClassrooms.map((c) => c.id));
    const linkedAssignmentIds = new Set(
      userClassrooms.flatMap((c) => c.assignment_ids || []),
    );

    return [...this.records.values()]
      .map((record) => structuredClone(record.assignment))
      .filter(
        (assignment) =>
          assignment.ownerId === userId ||
          assignment.students.some((student) => student.id === userId) ||
          (assignment.classroomId &&
            userClassroomIds.has(assignment.classroomId)) ||
          linkedAssignmentIds.has(assignment.id),
      );
  }
  async findById(id: string) {
    const record = this.records.get(id);
    return record ? structuredClone(record) : null;
  }
  async create(assignment: Assignment) {
    if (
      [...this.records.values()].some(
        (record) => record.assignment.id === assignment.id,
      )
    )
      return false;
    this.records.set(assignment.id, {
      assignment: structuredClone(assignment),
      version: 0,
    });
    return true;
  }
  async update(assignment: Assignment, version: number) {
    const record = this.records.get(assignment.id);
    if (!record || record.version !== version) return false;
    this.records.set(assignment.id, {
      assignment: structuredClone(assignment),
      version: version + 1,
    });
    return true;
  }
}
