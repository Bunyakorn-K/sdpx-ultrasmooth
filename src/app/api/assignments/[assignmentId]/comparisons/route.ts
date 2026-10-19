import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "#/db/client";
import { assignmentGroupMembers, classroomMembers, pairAssignments } from "#/db/schema";
import { apiError, notFound, unauthorized } from "#/lib/api-error";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { getAssignment } from "#/services/assignment-service";
import { canVote } from "#/services/voting-rules";
import { DrizzleComparisonRepository } from "#/repositories/drizzle-comparison-repository";

const VALID_STATUSES = new Set(["draft", "saved", "submitted"]);

// FR-API-01: idempotent — calling this again with the same body yields the
// same stored comparison (upsert keyed by pair_assignment_id).
export async function PUT(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId: assignmentIdParam } = await params;
  const assignmentId = Number(assignmentIdParam);

  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "student") return apiError(403, "STUDENT_ONLY", "Only students may vote.");

  const body = await request.json().catch(() => null);
  const pairAssignmentId = Number(body?.pairAssignmentId);
  const choice = Number(body?.choice);
  const status = body?.status;

  if (!Number.isInteger(pairAssignmentId)) {
    return apiError(400, "INVALID_BODY", "pairAssignmentId is required.");
  }
  if (!Number.isInteger(choice) || choice < 1 || choice > 6) {
    return apiError(400, "INVALID_BODY", "choice must be an integer between 1 and 6.");
  }
  if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
    return apiError(400, "INVALID_BODY", "status must be draft, saved, or submitted.");
  }

  const [pair] = await db.select().from(pairAssignments).where(eq(pairAssignments.id, pairAssignmentId));
  if (!pair || pair.assignmentId !== assignmentId || pair.evaluatorUserId !== user.id) {
    return notFound("Pair not found.");
  }

  const assignment = await getAssignment(assignmentId);
  if (!assignment) return notFound();
  const role = await getClassroomRole(assignment.classroomId, user.id);
  const [enrollment] = await db.select().from(assignmentGroupMembers).where(and(
    eq(assignmentGroupMembers.assignmentId, assignmentId), eq(assignmentGroupMembers.userId, user.id)));
  const [member] = await db.select().from(classroomMembers).where(and(
    eq(classroomMembers.classroomId, assignment.classroomId), eq(classroomMembers.userId, user.id)));
  if (!canVote({ ...pair, ...assignment, evaluatorUserId: pair.evaluatorUserId,
    role, userId: user.id, groupId: enrollment?.groupId ?? member?.groupId ?? null })) {
    return apiError(403, "VOTING_CLOSED", "Voting is closed or this pair is not eligible.");
  }

  const repo = new DrizzleComparisonRepository();
  const saved = await repo.save({
    id: 0,
    assignmentId,
    evaluatorId: user.id,
    itemAId: pair.itemAId,
    itemBId: pair.itemBId,
    choice,
    status: status as "draft" | "saved" | "submitted",
    pairAssignmentId: pair.id,
  });

  return NextResponse.json(saved);
}
