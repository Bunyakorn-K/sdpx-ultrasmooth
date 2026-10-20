"use client";

import { useState } from "react";
import { useWorkspace } from "@/features/workspace/context/workspace-provider";
import { useClassrooms } from "../hooks/use-classrooms";
import { ClassroomList } from "../components/classroom-list";
import { ClassroomEditorDialog } from "../components/classroom-editor-dialog";
import { LoadingState } from "@/shared/components/loading-state";

export function ClassroomListScreen() {
  const workspace = useWorkspace();
  const { user, demo, teacher, setToast, setError } = workspace;
  const { classrooms, loading, createClassroom, joinClassroom } = useClassrooms(user, demo, setError);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading && classrooms.length === 0) {
    return <LoadingState message="กำลังโหลดห้องเรียน..." />;
  }

  return (
    <>
      <ClassroomList
        classrooms={classrooms}
        assignments={workspace.assignments}
        teacher={teacher}
        onOpenCreate={() => setCreateOpen(true)}
        onJoinClassroom={async (code) => {
          try {
            const joined = await joinClassroom(code);
            await workspace.refreshAssignments?.();
            setToast(`เข้าร่วมห้องเรียน "${joined.name}" เรียบร้อยแล้ว`);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "ไม่สามารถเข้าร่วมห้องเรียนได้");
            throw err;
          }
        }}
      />
      <ClassroomEditorDialog
        open={createOpen}
        busy={busy}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (input) => {
          setBusy(true);
          try {
            const created = await createClassroom(input);
            setToast(`สร้าง Classroom "${created.name}" เรียบร้อยแล้ว`);
            setCreateOpen(false);
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
