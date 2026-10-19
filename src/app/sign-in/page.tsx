import { Geist } from "next/font/google";
import { SignInForm } from "#/features/auth/SignInForm";
import Link from "next/link";
import { ManagedAuthForm } from "#/features/auth/ManagedAuthForm";
import { devAuthEnabled } from "#/lib/auth-policy";
import { getAuth } from "#/lib/neon-auth";

export const dynamic = "force-dynamic";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export default function SignInPage() {
  if (!devAuthEnabled()) return <main className="flex min-h-screen flex-col items-center justify-center gap-7 bg-[#f5fbf8] px-6 py-16 text-slate-800">
    <Link href="/" className="font-serif text-3xl italic text-emerald-800">PairEval.</Link>
    <div className="text-center"><p className="mb-3 text-xs uppercase tracking-[0.2em]">Welcome back</p>
      <h1 className="font-serif text-4xl">Sign in to PairEval</h1></div>
    <ManagedAuthForm configured={Boolean(getAuth())} />
  </main>;
  return (
    <div
      className={`${geistSans.className} flex min-h-screen flex-col items-center justify-center gap-7 bg-[#f5fbf8] px-6 py-16 font-sans text-slate-800`}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="mb-5 font-serif text-3xl italic text-emerald-800">PairEval.</Link>
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-emerald-700">Your classroom, connected</p>
        <h1 className="font-serif text-4xl">Sign in to PairEval</h1>
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          Development sign-in — no Google account required yet. Enter the email your
          instructor imported into the roster (or any email to create a new account).
        </p>
      </div>
      <SignInForm />
    </div>
  );
}
