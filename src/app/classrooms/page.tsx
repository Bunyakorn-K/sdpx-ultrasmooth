import { redirect } from "next/navigation";

import { getCurrentUser } from "#/lib/auth";
import { PageShell } from "#/components/PageShell";
import { ClassroomList, CreateClassroomButton } from "#/features/classroom/ClassroomList";

export default async function ClassroomsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Classrooms</h1>
        <CreateClassroomButton />
      </div>
      <ClassroomList />
    </PageShell>
  );
}
