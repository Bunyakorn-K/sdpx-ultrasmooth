import { redirect } from "next/navigation";

import { getCurrentUser } from "#/lib/auth";
import { PageShell } from "#/components/PageShell";
import { CreateClassroomForm } from "#/features/classroom/CreateClassroomForm";

export default async function NewClassroomPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <PageShell maxWidth="max-w-sm" center>
      <h1 className="text-2xl font-semibold tracking-tight">New classroom</h1>
      <CreateClassroomForm />
    </PageShell>
  );
}
