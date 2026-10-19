import { redirect } from "next/navigation";

import { getCurrentUser } from "#/lib/auth";
import { PageShell } from "#/components/PageShell";
import { CreateClassroomForm } from "#/features/classroom/CreateClassroomForm";

export const dynamic = "force-dynamic";

export default async function NewClassroomPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "teacher") redirect("/classrooms");

  return (
    <PageShell maxWidth="max-w-sm" center>
      <h1 className="text-2xl font-semibold tracking-tight">New classroom</h1>
      <CreateClassroomForm />
    </PageShell>
  );
}
