import { asc, eq } from "drizzle-orm";

import { db } from "#/db/client";
import { assignments, criteria, groupEntities, ratings } from "#/db/schema";
import { getVotingSheet } from "#/services/rating-service";

export interface QuestionAverage {
  questionId: number;
  average: number | null;
  count: number;
}

export interface GroupScoreRow {
  groupId: number;
  groupName: string;
  questions: QuestionAverage[];
  /** Mean of every 1-5 score the group received, across all questions. */
  average: number | null;
  raterCount: number;
  /** `average` scaled from the 1-5 range onto the assignment's maximum score. */
  weightedScore: number;
}

export interface GroupScoresResult {
  rows: GroupScoreRow[];
  maxScore: number;
  questions: { id: number; text: string }[];
}

const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const round = (value: number) => Math.round(value * 100) / 100;

/** Pure aggregation, kept separate from the queries so it can be unit tested. */
export function summarizeRatings(
  groups: { id: number; name: string }[],
  questions: { id: number }[],
  given: { groupId: number; questionId: number; evaluatorUserId: number; score: number }[],
  maxScore: number,
): GroupScoreRow[] {
  return groups.map((group) => {
    const received = given.filter((rating) => rating.groupId === group.id);
    const average = mean(received.map((rating) => rating.score));
    return {
      groupId: group.id,
      groupName: group.name,
      questions: questions.map((question) => {
        const scores = received.filter((rating) => rating.questionId === question.id).map((rating) => rating.score);
        const questionAverage = mean(scores);
        return { questionId: question.id, average: questionAverage === null ? null : round(questionAverage), count: scores.length };
      }),
      average: average === null ? null : round(average),
      raterCount: new Set(received.map((rating) => rating.evaluatorUserId)).size,
      weightedScore: average === null ? 0 : round((average / 5) * maxScore),
    };
  });
}

export async function getGroupScores(assignmentId: number): Promise<GroupScoresResult> {
  const [assignment] = await db.select().from(assignments).where(eq(assignments.id, assignmentId));
  if (!assignment) throw new Error("Assignment not found");

  const [questions, groups, given] = await Promise.all([
    db.select({ id: criteria.id, text: criteria.name }).from(criteria)
      .where(eq(criteria.assignmentId, assignmentId)).orderBy(asc(criteria.displayOrder), asc(criteria.id)),
    db.select({ id: groupEntities.id, name: groupEntities.name }).from(groupEntities)
      .where(eq(groupEntities.assignmentId, assignmentId)).orderBy(asc(groupEntities.id)),
    db.select({ groupId: ratings.groupId, questionId: ratings.criterionId,
      evaluatorUserId: ratings.evaluatorUserId, score: ratings.score })
      .from(ratings).where(eq(ratings.assignmentId, assignmentId)),
  ]);
  const maxScore = Number(assignment.groupMaxScore);
  return { rows: summarizeRatings(groups, questions, given, maxScore), maxScore, questions };
}

/** How many of the scores a student owes (questions x groups other than their own) they have given. */
export async function getParticipation(assignmentId: number, userId: number) {
  const sheet = await getVotingSheet(assignmentId, userId);
  return { assigned: sheet.questions.length * sheet.groups.length, submitted: sheet.ratings.length };
}

export async function getStudentReport(assignmentId: number, userId: number) {
  return { participation: await getParticipation(assignmentId, userId) };
}

