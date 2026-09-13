import { describe, expect, it } from 'vitest';
import {
  InvalidQualityIndexError,
  InvalidScoreBoundsError,
  ScoringService,
} from '#/services/scoring-service';
import { FakeComparisonRepository } from '../fakes/fake-comparison-repo';
import { makeComparison } from '../factories';

describe('ScoringService - Business Rules', () => {
  const service = new ScoringService();

  it('maps Quality Index (q = 0.0) exactly to configured score floor', () => {
    const score = service.calculateScore(0.0, 60.0, 100.0);
    expect(score).toBe(60.0);
  });

  it('maps Quality Index (q = 1.0) exactly to configured score ceiling', () => {
    const score = service.calculateScore(1.0, 60.0, 100.0);
    expect(score).toBe(100.0);
  });

  it('linearly scales intermediate Quality Index (q = 0.5) to midpoint score', () => {
    const score = service.calculateScore(0.5, 60.0, 100.0);
    expect(score).toBe(80.0);
  });

  it('throws InvalidScoreBoundsError when floor >= ceiling', () => {
    expect(() => service.calculateScore(0.5, 80.0, 80.0)).toThrow(
      InvalidScoreBoundsError
    );
    expect(() => service.calculateScore(0.5, 90.0, 70.0)).toThrow(
      InvalidScoreBoundsError
    );
  });

  it('throws InvalidQualityIndexError when quality index is outside [0.0, 1.0]', () => {
    expect(() => service.calculateScore(-0.1, 60.0, 100.0)).toThrow(
      InvalidQualityIndexError
    );
    expect(() => service.calculateScore(1.05, 60.0, 100.0)).toThrow(
      InvalidQualityIndexError
    );
  });
});

describe('ScoringService with FakeComparisonRepository', () => {
  it('calculates aggregated student scores based on comparison wins', async () => {
    // Setup comparison records:
    // Student 1 wins comparison 1 (choice 2 prefers item A = student 1)
    // Student 1 wins comparison 2 (choice 1 prefers item A = student 1)
    // Student 2 loses both
    const fakeRepo = new FakeComparisonRepository([
      makeComparison({ id: 1, assignmentId: 101, itemAId: 1, itemBId: 2, choice: 2 }),
      makeComparison({ id: 2, assignmentId: 101, itemAId: 1, itemBId: 2, choice: 1 }),
    ]);

    const service = new ScoringService(fakeRepo);
    const results = await service.calculateScoresForAssignment(101, [1, 2], 60.0, 100.0);

    const student1 = results.find((r) => r.studentId === 1);
    const student2 = results.find((r) => r.studentId === 2);

    expect(student1).toBeDefined();
    expect(student1?.qualityIndex).toBe(1.0);
    expect(student1?.finalScore).toBe(100.0);

    expect(student2).toBeDefined();
    expect(student2?.qualityIndex).toBe(0.0);
    expect(student2?.finalScore).toBe(60.0);
  });
});