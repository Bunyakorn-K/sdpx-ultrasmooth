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
import { DeleteClassroomButton } from "#/features/classroom/DeleteClassroomButton";

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId: classroomIdParam } = await params;
  const classroomId = Number(classroomIdParam);

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // Independent reads run together; nothing renders until the role check passes.
  const [role, [classroom]] = await Promise.all([
    getClassroomRole(classroomId, user.id),
    db.select().from(classrooms).where(eq(classrooms.id, classroomId)),
  ]);
  if (!role || !classroom) notFound();

  return (
    <PageShell>
      <div className="rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/12 dark:bg-zinc-950">
        <div className="mb-3 flex items-start justify-between gap-4">
          <p className="pt-2 text-xs uppercase tracking-[0.15em] text-zinc-500">Classroom</p>
          {role === "INSTRUCTOR" && classroom.createdBy === user.id && <DeleteClassroomButton classroomId={classroomId} name={classroom.name} />}
        </div>
        <h1 className="break-words text-xl font-semibold">{classroom.name}</h1>
        {role === "INSTRUCTOR" && <p className="mt-3 text-sm text-slate-600">Student invitation code: <code className="rounded bg-emerald-50 px-2 py-1">{classroom.slug}</code></p>}
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
  const assignments = await listAssignments(classroomId);

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
                href={`/classrooms/${classroomId}/assignments/${assignment.id}/groups`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {assignment.status === "DRAFT" ? "Choose group →" : "View group →"}
              </Link>
              {assignment.status === "PUBLISHED" && <Link
                href={`/classrooms/${classroomId}/assignments/${assignment.id}/evaluate`}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Vote →
              </Link>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
