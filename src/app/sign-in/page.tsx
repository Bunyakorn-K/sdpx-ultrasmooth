import { Geist } from "next/font/google";
import { SignInForm } from "#/features/auth/SignInForm";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export default function SignInPage() {
  return (
    <div
      className={`${geistSans.className} flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 px-6 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100`}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600 text-lg font-bold text-white">
          P
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to PairEval</h1>
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          Development sign-in — no Google account required yet. Enter the email your
          instructor imported into the roster (or any email to create a new account).
        </p>
      </div>
      <SignInForm />
    </div>
  );
}
