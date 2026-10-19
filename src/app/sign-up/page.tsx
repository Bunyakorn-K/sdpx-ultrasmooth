import Link from "next/link";
import { ManagedAuthForm } from "#/features/auth/ManagedAuthForm";
import { getAuth } from "#/lib/neon-auth";
import { getCurrentUser } from "#/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/classrooms");
  return <main className="flex min-h-screen flex-col items-center justify-center gap-7 bg-[#f5fbf8] px-6 py-16 text-slate-800">
    <Link href="/" className="font-serif text-3xl italic text-emerald-800">PairEval.</Link>
    <div className="text-center"><p className="mb-3 text-xs uppercase tracking-[0.2em]">A fresh perspective</p>
      <h1 className="font-serif text-4xl">Learn better, together.</h1></div>
    <ManagedAuthForm register configured={Boolean(getAuth())} />
  </main>;
}
