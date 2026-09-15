import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { db } from "#/db/client";
import { classrooms } from "#/db/schema";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { getAssignment } from "#/services/assignment-service";
import { PageShell } from "#/components/PageShell";
import { AssignmentDashboardPanel } from "#/features/assignment/AssignmentDashboardPanel";
import { InstructorScoresTable } from "#/features/report/InstructorScoresTable";
import { RosterTable } from "#/features/classroom/RosterTable";

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

  const role = await getClassroomRole(classroomId, user.id);
  if (role !== "INSTRUCTOR") notFound();

  const assignment = await getAssignment(assignmentId);
  if (!assignment || assignment.classroomId !== classroomId) notFound();

  const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId));
  if (!classroom) notFound();

  return (
    <PageShell>
      <div className="rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/12 dark:bg-zinc-950">
        <Link
          href={`/classrooms/${classroomId}`}
          className="text-xs text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          ← {classroom.name}
        </Link>
        <h1 className="text-xl font-semibold">{assignment.name}</h1>
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

      <InstructorScoresTable assignmentId={assignmentId} published={assignment.status === "PUBLISHED"} />

      <RosterTable classroomId={classroomId} />
    </PageShell>
  );
}
