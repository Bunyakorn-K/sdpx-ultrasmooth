import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { db } from "#/db/client";
import { classrooms } from "#/db/schema";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { listAssignments } from "#/services/assignment-service";
import { PageShell } from "#/components/PageShell";
import { ClassroomRosterSection } from "#/features/classroom/ClassroomRosterSection";
import { AssignmentSection } from "#/features/classroom/AssignmentSection";

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId: classroomIdParam } = await params;
  const classroomId = Number(classroomIdParam);

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const role = await getClassroomRole(classroomId, user.id);
  if (!role) notFound();

  const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classroomId));
  if (!classroom) notFound();

  return (
    <PageShell>
      <div className="rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/12 dark:bg-zinc-950">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Classroom</p>
        <h1 className="text-xl font-semibold">{classroom.name}</h1>
      </div>

      {role === "INSTRUCTOR" ? (
        <>
          <AssignmentSection classroomId={classroomId} />
          <ClassroomRosterSection classroomId={classroomId} />
        </>
      ) : (
        <StudentAssignmentList classroomId={classroomId} />
      )}
    </PageShell>
  );
}

async function StudentAssignmentList({ classroomId }: { classroomId: number }) {
  const assignments = (await listAssignments(classroomId)).filter((a) => a.status === "PUBLISHED");

  if (assignments.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No assignments open yet — check back once your instructor publishes one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold">Open assignments</h2>
      <ul className="flex flex-col gap-2">
        {assignments.map((assignment) => (
          <li key={assignment.id} className="flex items-center justify-between rounded-lg border border-black/8 px-3 py-2 text-sm dark:border-white/10">
            <span>{assignment.name}</span>
            <span className="flex gap-3 text-xs">
              <Link
                href={`/classrooms/${classroomId}/assignments/${assignment.id}/evaluate`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Evaluate →
              </Link>
              <Link
                href={`/classrooms/${classroomId}/assignments/${assignment.id}/report`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                My score →
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
