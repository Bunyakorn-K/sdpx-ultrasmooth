import type { Classroom } from "@/features/classroom/types";
import type {
  ClassroomRecord,
  ClassroomRepository,
} from "@/features/classroom/server/classroom-repository";

export class FakeClassroomRepository implements ClassroomRepository {
  private readonly records = new Map<string, ClassroomRecord>();

  constructor(classrooms: Classroom[] = []) {
    classrooms.forEach((c) =>
      this.records.set(c.id, {
        classroom: structuredClone(c),
        version: 0,
      }),
    );
  }

  async listForUser(userId: string): Promise<Classroom[]> {
    return [...this.records.values()]
      .map((r) => structuredClone(r.classroom))
      .filter(
        (c) =>
          c.created_by === userId ||
          c.members.some((m) => m.user_id === userId),
      );
  }

  async findById(id: string): Promise<ClassroomRecord | null> {
    const record = this.records.get(id);
    return record ? structuredClone(record) : null;
  }

  async findBySlug(slug: string): Promise<ClassroomRecord | null> {
    const record = [...this.records.values()].find(
      (r) => r.classroom.slug === slug,
    );
    return record ? structuredClone(record) : null;
  }

  async create(classroom: Classroom): Promise<boolean> {
    if (
      [...this.records.values()].some(
        (r) => r.classroom.slug === classroom.slug,
      )
    ) {
      return false;
    }
    this.records.set(classroom.id, {
      classroom: structuredClone(classroom),
      version: 0,
    });
    return true;
  }

  async update(classroom: Classroom, version: number): Promise<boolean> {
    const record = this.records.get(classroom.id);
    if (!record || record.version !== version) return false;
    record.classroom = structuredClone(classroom);
    record.version += 1;
    return true;
  }
}
