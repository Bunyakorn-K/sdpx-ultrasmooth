"use client";

import { useWorkspace } from "@/features/workspace/context/workspace-provider";
import { AssignmentList } from "../components/assignment-list";
import { LoadingState } from "@/shared/components/loading-state";

export function AssignmentListScreen() {
  const workspace = useWorkspace();
  if (!workspace.ready || !workspace.user || workspace.loadingAssignments)
    return <LoadingState message="กำลังโหลด Assignment..." />;
  return <AssignmentList {...workspace} />;
}
