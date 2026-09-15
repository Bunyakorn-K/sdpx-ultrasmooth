import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { getAssignment } from "#/services/assignment-service";
import { PageShell } from "#/components/PageShell";
import { EvaluationWorkspace } from "#/features/evaluation/EvaluationWorkspace";

export default async function EvaluatePage({
  params,
}: {
  params: Promise<{ classroomId: string; assignmentId: string }>;
}) {
  const { classroomId: classroomIdParam, assignmentId: assignmentIdParam } = await params;
  const classroomId = Number(classroomIdParam);
  const assignmentId = Number(assignmentIdParam);

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const role = await getClassroomRole(classroomId, user.id);
  if (!role) notFound();

  const assignment = await getAssignment(assignmentId);
  if (!assignment || assignment.classroomId !== classroomId) notFound();
  if (assignment.status !== "PUBLISHED") notFound();

  return (
    <PageShell maxWidth="max-w-2xl">
      <Link
        href={`/classrooms/${classroomId}`}
        className="text-xs text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400"
      >
        ← Back to classroom
      </Link>
      <EvaluationWorkspace assignmentId={assignmentId} />
    </PageShell>
  );
}
