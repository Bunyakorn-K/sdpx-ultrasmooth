import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { db } from "#/db/client";
import { classrooms } from "#/db/schema";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { getAssignment } from "#/services/assignment-service";
import { getVotingProgress } from "#/services/report-service";
import { PageShell } from "#/components/PageShell";
import { AssignmentDashboardPanel } from "#/features/assignment/AssignmentDashboardPanel";
import { InstructorScoresTable } from "#/features/report/InstructorScoresTable";
import { VotingProgress } from "#/features/report/VotingProgress";
import { RosterTable } from "#/features/classroom/RosterTable";
import { AssignmentGroups } from "#/features/assignment/AssignmentGroups";

export default async function AssignmentDashboardPage({
  params,
}: {
  params: Promise<{ classroomId: string; assignmentId: string }>;
}) {
  const { classroomId: classroomIdParam, assignmentId: assignmentIdParam } = await params;
  const classroomId = Number(classroomIdParam);
  const assignmentId = Number(assignmentIdParam);

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // Independent reads run together; nothing renders until the role check passes.
  const [role, assignment, [classroom]] = await Promise.all([
    getClassroomRole(classroomId, user.id),
    getAssignment(assignmentId),
    db.select().from(classrooms).where(eq(classrooms.id, classroomId)),
  ]);
  if (role !== "INSTRUCTOR") notFound();
  if (!assignment || assignment.classroomId !== classroomId || !classroom) notFound();
  const progress = assignment.status === "PUBLISHED" ? await getVotingProgress(assignmentId, classroomId) : null;

  return (
    <PageShell>
      <div className="rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/12 dark:bg-zinc-950">
        <Link
          href="/classrooms"
          className="text-xs text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          ← Assignments
        </Link>
        <h1 className="text-xl font-semibold">{assignment.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Join code for students: <code className="rounded bg-emerald-50 px-2 py-1 text-emerald-900">{classroom.slug}</code>
        </p>
      </div>

      <AssignmentDashboardPanel
        assignment={{
          id: assignment.id,
          name: assignment.name,
          status: assignment.status,
          groupMaxScore: assignment.groupMaxScore,
          deadlineUtc: assignment.deadlineUtc ? assignment.deadlineUtc.toISOString() : null,
        }}
      />

      {progress && <VotingProgress progress={progress} />}

      <InstructorScoresTable assignmentId={assignmentId} published={assignment.status === "PUBLISHED"} />
      <AssignmentGroups assignmentId={assignmentId} teacher open={assignment.status === "DRAFT" && (!assignment.deadlineUtc || assignment.deadlineUtc > new Date())} />

      <RosterTable classroomId={classroomId} />
    </PageShell>
  );
}
