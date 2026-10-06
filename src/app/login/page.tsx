import type { Metadata } from "next";
import LoginDemo from "#/features/demo/LoginDemo";

export const metadata: Metadata = { title: "Login — PairEval" };

export default function Page() {
  return <LoginDemo />;
}
