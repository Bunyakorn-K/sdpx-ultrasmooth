"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceShell } from "../components/workspace-shell";
import { useWorkspace } from "../context/workspace-provider";
import { LoadingState } from "@/shared/components/loading-state";

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const protectedRoute =
    pathname === "/assignments" ||
    pathname.startsWith("/assignments/") ||
    pathname === "/classrooms" ||
    pathname.startsWith("/classrooms/");

  useEffect(() => {
    if (
      protectedRoute &&
      workspace.ready &&
      !workspace.user &&
      !workspace.signingOut
    )
      router.replace("/login");
  }, [
    protectedRoute,
    workspace.ready,
    workspace.user,
    workspace.signingOut,
    router,
  ]);

  if (!workspace.ready) {
    return <LoadingState message="กำลังเข้าสู่ระบบ..." minHeight="100vh" />;
  }

  if (!workspace.user) return null;

  return <WorkspaceShell controller={workspace}>{children}</WorkspaceShell>;
}
