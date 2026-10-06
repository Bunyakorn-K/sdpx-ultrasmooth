import type { Metadata } from "next";
import HomeLanding from "#/features/home/HomeLanding";

export const metadata: Metadata = { title: "PairEval — Pairwise Student Evaluation" };

export default function Page() {
  return <HomeLanding />;
}
