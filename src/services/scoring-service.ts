import { Comparison, ComparisonRepository } from '#/repositories/comparison-repository';

export class InvalidScoreBoundsError extends Error {
  constructor(message = 'Score floor must be strictly less than ceiling and within valid percentage bounds') {
    super(message);
    this.name = 'InvalidScoreBoundsError';
  }
}

export class InvalidQualityIndexError extends Error {
  constructor(message = 'Quality index must be between 0.0 and 1.0') {
    super(message);
    this.name = 'InvalidQualityIndexError';
  }
}

export interface StudentScoreResult {
  studentId: number;
  qualityIndex: number;
  finalScore: number;
}

export class ScoringService {
  constructor(private readonly comparisonRepo?: ComparisonRepository) {}

  /**
   * Calculates individual student score from quality index using linear band mapping formula.
   * score = floor + q * (ceiling - floor)
   */
  calculateScore(qualityIndex: number, floor: number, ceiling: number): number {
    if (floor < 0 || ceiling > 100 || floor >= ceiling) {
      throw new InvalidScoreBoundsError();
    }
    if (qualityIndex < 0 || qualityIndex > 1) {
      throw new InvalidQualityIndexError();
    }

    const score = floor + qualityIndex * (ceiling - floor);
    return Math.round(score * 100) / 100;
  }

  /**
   * Aggregates comparison wins from repository and calculates final scores.
   */
  async calculateScoresForAssignment(
    assignmentId: number,
    studentIds: number[],
    floor: number,
    ceiling: number
  ): Promise<StudentScoreResult[]> {
    if (!this.comparisonRepo) {
      throw new Error('ComparisonRepository is required to calculate assignment scores');
    }

    const comparisons = await this.comparisonRepo.findByAssignmentId(assignmentId);
    const winCounts = new Map<number, number>();
    const totalComparisons = new Map<number, number>();

    for (const id of studentIds) {
      winCounts.set(id, 0);
      totalComparisons.set(id, 0);
    }

    for (const comp of comparisons) {
      // choices 1-3 indicate preference for item A; 4-6 indicate preference for item B
      totalComparisons.set(comp.itemAId, (totalComparisons.get(comp.itemAId) ?? 0) + 1);
      totalComparisons.set(comp.itemBId, (totalComparisons.get(comp.itemBId) ?? 0) + 1);

      if (comp.choice <= 3) {
        winCounts.set(comp.itemAId, (winCounts.get(comp.itemAId) ?? 0) + 1);
      } else {
        winCounts.set(comp.itemBId, (winCounts.get(comp.itemBId) ?? 0) + 1);
      }
    }

    return studentIds.map((id) => {
      const total = totalComparisons.get(id) ?? 0;
      const wins = winCounts.get(id) ?? 0;
      const qualityIndex = total === 0 ? 0.0 : Math.round((wins / total) * 1000) / 1000;
      const finalScore = this.calculateScore(qualityIndex, floor, ceiling);

      return {
        studentId: id,
        qualityIndex,
        finalScore,
      };
    });
  }
}