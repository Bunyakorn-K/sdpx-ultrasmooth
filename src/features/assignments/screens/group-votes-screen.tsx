"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowBack } from "@mui/icons-material";
import { Alert, Button, CircularProgress } from "@mui/material";
import { useWorkspace } from "@/features/workspace/context/workspace-provider";
import { GroupVotesPanel } from "../components/group-votes-panel";

export function GroupVotesScreen() {
  const { groupId } = useParams<{ id: string; groupId: string }>();
  const workspace = useWorkspace();
  if (!workspace.ready || !workspace.user || workspace.loadingAssignments)
    return <CircularProgress aria-label="กำลังโหลดการโหวตของสมาชิก" />;
  const assignment = workspace.active;
  if (
    !assignment ||
    workspace.user.role !== "teacher" ||
    assignment.ownerId !== workspace.user.id
  )
    return (
      <Alert severity="warning">
        เฉพาะอาจารย์เจ้าของงานเท่านั้นที่ดูการโหวตของสมาชิกได้
      </Alert>
    );
  const group = assignment.groups.find((item) => item.id === groupId);
  return (
    <>
      <Button
        component={Link}
        href={`/assignments/${encodeURIComponent(assignment.id)}`}
        startIcon={<ArrowBack />}
        color="inherit"
        onClick={() => workspace.setTab(0)}
        sx={{ mb: 3 }}
      >
        กลับไปกลุ่มทั้งหมด
      </Button>
      {group ? (
        <GroupVotesPanel assignment={assignment} group={group} />
      ) : (
        <Alert severity="warning">ไม่พบกลุ่มนี้ใน assignment</Alert>
      )}
    </>
  );
}
