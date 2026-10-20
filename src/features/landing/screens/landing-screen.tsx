"use client";

import { useRouter } from "next/navigation";
import { LandingPage } from "../components/landing-page";
import { useWorkspace } from "@/features/workspace/context/workspace-provider";

export function LandingScreen() {
  const workspace = useWorkspace();
  const router = useRouter();
  return (
    <LandingPage
      user={workspace.user}
      openModal={workspace.openModal}
      enterDemo={workspace.enterDemo}
      onGoToApp={() => router.push("/classrooms")}
    />
  );
}
