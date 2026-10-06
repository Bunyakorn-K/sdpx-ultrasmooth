import type { Metadata } from "next";
import EvaluateDemo from "#/features/demo/EvaluateDemo";

export const metadata: Metadata = { title: "Workspace — PairEval" };

export default function Page() {
  return <EvaluateDemo />;
}
