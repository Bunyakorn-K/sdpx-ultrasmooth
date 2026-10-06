import type { Metadata } from "next";
import CreateAssignmentDemo from "#/features/demo/CreateAssignmentDemo";

export const metadata: Metadata = { title: "Create Assignment — PairEval" };

export default function Page() {
  return <CreateAssignmentDemo />;
}
