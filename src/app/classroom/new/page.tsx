import type { Metadata } from "next";
import CreateClassroomDemo from "#/features/demo/CreateClassroomDemo";

export const metadata: Metadata = { title: "Create Classroom — PairEval" };

export default function Page() {
  return <CreateClassroomDemo />;
}
