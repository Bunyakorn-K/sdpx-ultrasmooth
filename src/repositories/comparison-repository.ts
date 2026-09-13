export interface Comparison {
  id: number;
  assignmentId: number;
  evaluatorId: number;
  itemAId: number;
  itemBId: number;
  choice: number; // 1 to 6
  status: 'draft' | 'saved' | 'submitted';
}

export interface ComparisonRepository {
  findByAssignmentId(assignmentId: number): Promise<Comparison[]>;
  save(comparison: Comparison): Promise<Comparison>;
  countByAssignmentId(assignmentId: number): Promise<number>;
}