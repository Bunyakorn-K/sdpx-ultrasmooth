import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "#/components/PageShell";
import { AssignmentGroups } from "#/features/assignment/AssignmentGroups";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { getAssignment } from "#/services/assignment-service";

export default async function GroupsPage({ params }: { params: Promise<{ classroomId: string; assignmentId: string }> }) {
  const { classroomId, assignmentId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const assignment = await getAssignment(Number(assignmentId));
  if (!assignment || assignment.classroomId !== Number(classroomId)) notFound();
  const role = await getClassroomRole(assignment.classroomId, user.id);
  if (!role) notFound();
  const open = assignment.status === "DRAFT" && (!assignment.deadlineUtc || assignment.deadlineUtc > new Date());
  return <PageShell>
    <Link href={`/classrooms/${classroomId}`} className="text-sm text-emerald-800">← Back to classroom</Link>
    <h1 className="font-serif text-3xl">{assignment.name}</h1>
    <AssignmentGroups assignmentId={assignment.id} teacher={role === "INSTRUCTOR"} open={open} />
    {assignment.status === "PUBLISHED" && role === "STUDENT" && <Link href={`/classrooms/${classroomId}/assignments/${assignmentId}/evaluate`} className="text-emerald-800 underline">Start voting →</Link>}
  </PageShell>;
}
