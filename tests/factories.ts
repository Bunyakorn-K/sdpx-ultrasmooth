import { Comparison } from '#/repositories/comparison-repository';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'instructor';
}

export interface Assignment {
  id: number;
  classroomId: number;
  title: string;
  scoreFloor: number;
  scoreCeiling: number;
}

export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  email: 'student@uni.ac.th',
  name: 'Student One',
  role: 'student',
  ...overrides,
});

export const makeAssignment = (overrides: Partial<Assignment> = {}): Assignment => ({
  id: 101,
  classroomId: 1,
  title: 'Milestone 1 Pairwise Evaluation',
  scoreFloor: 60.0,
  scoreCeiling: 100.0,
  ...overrides,
});

export const makeComparison = (overrides: Partial<Comparison> = {}): Comparison => ({
  id: 1,
  assignmentId: 101,
  evaluatorId: 10,
  itemAId: 1,
  itemBId: 2,
  choice: 2, // Prefer A
  status: 'saved',
  ...overrides,
});