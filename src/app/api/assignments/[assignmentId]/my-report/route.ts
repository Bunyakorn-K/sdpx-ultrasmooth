import { NextResponse } from "next/server";

import { notFound, unauthorized } from "#/lib/api-error";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { getAssignment } from "#/services/assignment-service";
import { getStudentReport } from "#/services/report-service";

export async function GET(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId: assignmentIdParam } = await params;
  const assignmentId = Number(assignmentIdParam);

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const assignment = await getAssignment(assignmentId);
  if (!assignment) return notFound("Assignment not found.");

  const role = await getClassroomRole(assignment.classroomId, user.id);
  if (!role) return notFound("Assignment not found.");

  const report = await getStudentReport(assignmentId, user.id);
  return NextResponse.json(report);
}
