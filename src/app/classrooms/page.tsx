import { redirect } from "next/navigation";

import { getCurrentUser } from "#/lib/auth";
import { PageShell } from "#/components/PageShell";
import { AssignmentHome } from "#/features/assignment/AssignmentHome";

export const dynamic = "force-dynamic";

// Kept at /classrooms so existing sign-in redirects and links still land here.
export default async function AssignmentsHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <PageShell>
      <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
      <AssignmentHome teacher={user.role === "teacher"} />
    </PageShell>
  );
}
