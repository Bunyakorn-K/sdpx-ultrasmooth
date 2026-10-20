"use client";

import Link from "next/link";
import { Alert, Button } from "@mui/material";
import { useWorkspace } from "@/features/workspace/context/workspace-provider";
import { AssignmentDetail } from "../components/assignment-detail";
import { LoadingState } from "@/shared/components/loading-state";

export function AssignmentDetailScreen() {
  const workspace = useWorkspace();
  if (!workspace.ready || !workspace.user || workspace.loadingAssignments)
    return <LoadingState message="กำลังโหลดข้อมูล Assignment..." />;
  if (!workspace.active)
    return (
      <Alert
        severity="warning"
        action={
          <Button component={Link} href="/assignments" color="inherit">
            กลับไป assignment
          </Button>
        }
      >
        ไม่พบ assignment หรือคุณไม่มีสิทธิ์เข้าถึง
      </Alert>
    );
  return <AssignmentDetail {...workspace} />;
}
