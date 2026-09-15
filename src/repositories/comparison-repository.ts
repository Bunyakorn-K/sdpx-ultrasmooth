export interface Comparison {
  id: number;
  assignmentId: number;
  evaluatorId: number;
  itemAId: number;
  itemBId: number;
  choice: number; // 1 to 6
  status: 'draft' | 'saved' | 'submitted';
  // Present on DB-backed comparisons (see DrizzleComparisonRepository); the
  // in-memory FakeComparisonRepository used in tests doesn't need it.
  pairAssignmentId?: number;
}

export interface ComparisonRepository {
  findByAssignmentId(assignmentId: number): Promise<Comparison[]>;
  save(comparison: Comparison): Promise<Comparison>;
  countByAssignmentId(assignmentId: number): Promise<number>;
}