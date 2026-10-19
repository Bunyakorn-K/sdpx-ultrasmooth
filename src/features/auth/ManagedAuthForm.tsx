"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "#/lib/auth-client";
import { useHydrated } from "#/lib/use-hydrated";

export function ManagedAuthForm({ register = false, configured }: { register?: boolean; configured: boolean }) {
  const ready = useHydrated();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");

  async function verification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const otp = String(new FormData(event.currentTarget).get("otp") ?? "");
    setPending(true);
    setMessage("");
    try {
      const { error } = await authClient.emailOtp.verifyEmail({ email: verificationEmail, otp });
      if (error) { setMessage("The verification code is invalid or expired."); return; }
      const { data } = await authClient.getSession();
      router.push(data?.user ? "/classrooms" : "/sign-in");
      router.refresh();
    } catch { setMessage("Could not verify your email. Please try again."); }
    finally { setPending(false); }
  }

  async function sendCode() {
    setPending(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email: verificationEmail, type: "email-verification" });
      setMessage(error ? "Could not send a code. Please try again later." : "Check your email for a verification code.");
    } catch { setMessage("Could not send a code. Please try again later."); }
    finally { setPending(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setPending(true);
    setMessage("");
    try {
      const result = register
        ? await authClient.signUp.email({ email, password, name: String(form.get("name") ?? "").trim() })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        if (result.error.code === "EMAIL_NOT_VERIFIED") setVerificationEmail(email);
        setMessage(register ? "Could not create the account. Check your details or try signing in."
          : "Could not sign in. Check your email and password.");
        return;
      }
      const { data, error } = await authClient.getSession();
      if (error || !data?.user) {
        if (register) setVerificationEmail(email);
        setMessage("Check your email to verify your account, then sign in.");
        return;
      }
      router.push("/classrooms");
      router.refresh();
    } catch {
      setMessage("Authentication is unavailable. Please try again shortly.");
    } finally {
      setPending(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
  if (verificationEmail) return <form onSubmit={verification} className="flex w-full max-w-sm flex-col gap-5">
    <p className="text-sm text-slate-600">Verify your email to finish creating your account.</p>
    <label className="text-sm">Verification code<input name="otp" required autoComplete="one-time-code" inputMode="numeric" className={inputClass} /></label>
    {message && <p role="status" className="text-sm">{message}</p>}
    <button disabled={pending} className="rounded-xl bg-emerald-700 px-5 py-3 text-white">{pending ? "Please wait…" : "Verify email"}</button>
    <button type="button" disabled={pending} onClick={sendCode} className="text-sm text-emerald-800 underline">Send verification code</button>
    <Link href="/sign-in" className="text-center text-sm text-slate-600">Back to sign in</Link>
  </form>;
  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-5">
      <fieldset disabled={!ready || pending || !configured} className="contents">
      {register && <label className="space-y-2 text-sm">Name
        <input className={inputClass} name="name" autoComplete="name" required maxLength={100} />
      </label>}
      <label className="space-y-2 text-sm">Email
        <input className={inputClass} name="email" type="email" autoComplete="email" required maxLength={254} />
      </label>
      <label className="space-y-2 text-sm">Password
        <input className={inputClass} name="password" type="password" minLength={8} maxLength={128}
          autoComplete={register ? "new-password" : "current-password"} required />
      </label>
      {!configured && <p role="status" className="text-sm text-amber-800">Sign-in is awaiting Neon Auth configuration.</p>}
      {message && <p role="alert" className="text-sm text-slate-700">{message}</p>}
      <button disabled={pending || !configured} className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50">
        {pending ? "Please wait…" : register ? "Create account" : "Sign in"}
      </button>
      </fieldset>
      {register && <p className="text-xs leading-5 text-slate-500">New accounts join as students. Teacher access is assigned by your institution.</p>}
      <Link href={register ? "/sign-in" : "/sign-up"} className="text-center text-sm text-emerald-800 underline underline-offset-4">
        {register ? "Already have an account? Sign in" : "New to PairEval? Create an account"}
      </Link>
    </form>
  );
}
