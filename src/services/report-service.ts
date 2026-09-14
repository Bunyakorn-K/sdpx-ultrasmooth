import { and, eq } from "drizzle-orm";

import { db } from "#/db/client";
import { assignments, classroomMembers, comparisons, criteria, groupEntities, pairAssignments } from "#/db/schema";
import { ScoringService } from "#/services/scoring-service";
import { computeQualityIndexForCriterion } from "#/services/quality-index";

const MIN_COMPARISONS_FOR_CONFIDENCE = 3; // FR-SCORE-05 default

export interface GroupScoreRow {
  groupId: number;
  groupName: string;
  qualityIndex: number;
  comparisonCount: number;
  scoreRatio: number;
  weightedScore: number;
  lowConfidence: boolean;
}

export interface GroupScoresResult {
  rows: GroupScoreRow[];
  maxScore: number;
  floorPct: number;
  ceilingPct: number;
  criterionName: string;
}

/**
 * PRD §9.2/§9.3: quality index (via quality-index.ts) → band-mapped score
 * (via the existing, already-correct ScoringService.calculateScore). FR-SCORE-05:
 * groups under the comparison-count threshold are flagged, not hidden.
 */
export async function getGroupScores(assignmentId: number): Promise<GroupScoresResult> {
  const [assignment] = await db.select().from(assignments).where(eq(assignments.id, assignmentId));
  if (!assignment) throw new Error("Assignment not found");

  const [criterion] = await db.select().from(criteria).where(eq(criteria.assignmentId, assignmentId));
  if (!criterion) throw new Error("Assignment has no criterion");

  const groups = await db.select().from(groupEntities).where(eq(groupEntities.classroomId, assignment.classroomId));
  const qualityByGroup = new Map(
    (await computeQualityIndexForCriterion(assignmentId, criterion.id)).map((row) => [row.itemId, row]),
  );

  const scoringService = new ScoringService();
  const floorPct = Number(assignment.scoreFloorPct);
  const ceilingPct = Number(assignment.scoreCeilingPct);
  const maxScore = Number(assignment.groupMaxScore);

  const rows: GroupScoreRow[] = groups.map((group) => {
    const quality = qualityByGroup.get(group.id);
    const qualityIndex = quality?.qualityIndex ?? 0;
    const comparisonCount = quality?.comparisonCount ?? 0;
    const scorePct = scoringService.calculateScore(qualityIndex, floorPct, ceilingPct);
    const scoreRatio = scorePct / 100;

    return {
      groupId: group.id,
      groupName: group.name,
      qualityIndex,
      comparisonCount,
      scoreRatio,
      weightedScore: Math.round(scoreRatio * maxScore * 1000) / 1000,
      lowConfidence: comparisonCount < MIN_COMPARISONS_FOR_CONFIDENCE,
    };
  });

  return { rows, maxScore, floorPct, ceilingPct, criterionName: criterion.name };
}

export interface StudentReport {
  groupScore: GroupScoreRow | null;
  maxScore: number;
  criterionName: string;
  participation: { assigned: number; submitted: number };
}

export async function getStudentReport(assignmentId: number, userId: number): Promise<StudentReport> {
  const [assignment] = await db.select().from(assignments).where(eq(assignments.id, assignmentId));
  if (!assignment) throw new Error("Assignment not found");

  const [membership] = await db
    .select({ groupId: classroomMembers.groupId })
    .from(classroomMembers)
    .where(and(eq(classroomMembers.classroomId, assignment.classroomId), eq(classroomMembers.userId, userId)));

  const { rows, maxScore, criterionName } = await getGroupScores(assignmentId);
  const groupScore = membership?.groupId != null ? rows.find((row) => row.groupId === membership.groupId) ?? null : null;

  const myPairs = await db
    .select({ status: comparisons.status })
    .from(pairAssignments)
    .leftJoin(comparisons, eq(comparisons.pairAssignmentId, pairAssignments.id))
    .where(and(eq(pairAssignments.assignmentId, assignmentId), eq(pairAssignments.evaluatorUserId, userId)));

  const assigned = myPairs.length;
  const submitted = myPairs.filter((row) => row.status === "submitted").length;

  return { groupScore, maxScore, criterionName, participation: { assigned, submitted } };
}
