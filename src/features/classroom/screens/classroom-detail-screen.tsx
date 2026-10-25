"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert, Box, Button } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import Link from "next/link";
import { useWorkspace } from "@/features/workspace/context/workspace-provider";
import { useClassrooms } from "../hooks/use-classrooms";
import { ClassroomDetail } from "../components/classroom-detail";
import { LoadingState } from "@/shared/components/loading-state";

export function ClassroomDetailScreen() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? decodeURIComponent(params.id) : "";

  const workspace = useWorkspace();
  const {
    user,
    demo,
    teacher,
    assignments,
    openModal,
    setToast,
    setError,
    refreshAssignments,
  } = workspace;
  const {
    classrooms,
    loading,
    linkAssignment,
    importRoster,
    addStaff,
    removeMember,
    archiveClassroom,
  } = useClassrooms(user, demo, setError);

  const classroom = useMemo(
    () => classrooms.find((c) => c.id === id || c.slug === id),
    [classrooms, id],
  );

  useEffect(() => {
    void refreshAssignments?.();
  }, [id, refreshAssignments]);

  const classroomAssignments = useMemo(() => {
    if (!classroom) return [];
    return assignments.filter(
      (a) =>
        a.classroomId === classroom.id ||
        classroom.assignment_ids?.includes(a.id) ||
        a.description?.includes(classroom.slug) ||
        a.subject.toLowerCase() === classroom.name.toLowerCase() ||
        a.subject.toLowerCase() === classroom.slug.toLowerCase(),
    );
  }, [assignments, classroom]);

  if (loading && !classroom) {
    return <LoadingState message="กำลังโหลดข้อมูลห้องเรียน..." />;
  }

  if (
    workspace.loadingAssignments &&
    !classroomAssignments.length &&
    classroom?.assignment_ids?.length
  ) {
    return <LoadingState message="กำลังโหลดข้อมูล Assignment ในห้องเรียน..." />;
  }

  if (!classroom) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          ไม่พบห้องเรียนที่ระบุ หรือคุณไม่มีสิทธิ์เข้าถึงห้องเรียนนี้
        </Alert>
        <Button
          component={Link}
          href="/classrooms"
          startIcon={<ArrowBack />}
          variant="outlined"
        >
          กลับไปหน้ารวมห้องเรียน
        </Button>
      </Box>
    );
  }

  return (
    <ClassroomDetail
      classroom={classroom}
      assignments={classroomAssignments}
      allAssignments={assignments}
      teacher={teacher}
      onImportRoster={async (roster) => {
        await importRoster(classroom.id, roster);
        await refreshAssignments();
      }}
      onAddStaff={async (input) => {
        await addStaff(classroom.id, input);
      }}
      onRemoveMember={async (memberId) => {
        await removeMember(classroom.id, memberId);
      }}
      onArchive={async () => {
        await archiveClassroom(classroom.id);
        router.push("/classrooms");
      }}
      onLinkAssignment={async (assignmentId) => {
        await linkAssignment(classroom.id, assignmentId);
        await workspace.refreshAssignments?.();
        setToast("เชื่อมโยง Assignment เข้าห้องเรียนนี้เรียบร้อยแล้ว");
      }}
      onCreateAssignment={() => {
        openModal("create", {
          classroomId: classroom.id,
          classroomName: classroom.name,
        });
      }}
      setToast={setToast}
      setError={setError}
    />
  );
}
