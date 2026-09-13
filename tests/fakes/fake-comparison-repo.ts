import { Comparison, ComparisonRepository } from '#/repositories/comparison-repository';

export class FakeComparisonRepository implements ComparisonRepository {
  private comparisons: Map<number, Comparison> = new Map();

  constructor(initialComparisons: Comparison[] = []) {
    for (const comp of initialComparisons) {
      this.comparisons.set(comp.id, comp);
    }
  }

  async findByAssignmentId(assignmentId: number): Promise<Comparison[]> {
    return Array.from(this.comparisons.values()).filter(
      (c) => c.assignmentId === assignmentId
    );
  }

  async save(comparison: Comparison): Promise<Comparison> {
    const id = comparison.id || this.comparisons.size + 1;
    const saved = { ...comparison, id };
    this.comparisons.set(id, saved);
    return saved;
  }

  async countByAssignmentId(assignmentId: number): Promise<number> {
    return (await this.findByAssignmentId(assignmentId)).length;
  }
}