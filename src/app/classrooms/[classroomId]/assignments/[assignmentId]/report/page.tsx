import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { getAssignment } from "#/services/assignment-service";
import { PageShell } from "#/components/PageShell";
import { StudentReportPanel } from "#/features/report/StudentReportPanel";

export default async function ReportPage({
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

  return (
    <PageShell maxWidth="max-w-2xl">
      <div className="rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/12 dark:bg-zinc-950">
        <Link
          href={`/classrooms/${classroomId}`}
          className="text-xs text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          ← Back to classroom
        </Link>
        <h1 className="text-xl font-semibold">PairEval: {assignment.name} — สรุปคะแนน</h1>
      </div>

      <StudentReportPanel assignmentId={assignmentId} />
    </PageShell>
  );
}
