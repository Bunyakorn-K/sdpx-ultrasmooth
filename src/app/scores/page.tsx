import type { Metadata } from "next";
import ScoresDemo from "#/features/demo/ScoresDemo";

export const metadata: Metadata = { title: "Scores — PairEval" };

export default function Page() {
  return <ScoresDemo />;
}
