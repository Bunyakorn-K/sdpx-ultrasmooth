"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { useHydrated } from "#/lib/use-hydrated";

export function SignInForm() {
  const ready = useHydrated();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await signIn({ email, displayName: displayName || undefined });
  }

  async function signIn(payload: { email?: string; displayName?: string; demoRole?: "teacher" | "student" }) {
    setError(null);
    setPending(true);

    const response = await fetch("/api/auth/dev-sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPending(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Sign-in failed.");
      return;
    }

    router.push("/classrooms");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <fieldset disabled={!ready || pending} className="contents">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@uni.ac.th"
          className="rounded-lg border border-black/12 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-950"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Display name (optional)
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="rounded-lg border border-black/12 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-950"
        />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-slate-800">
        <p className="mb-3 font-medium">Local test accounts — no password required</p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onPress={() => void signIn({ demoRole: "teacher" })}>Use Teacher</Button>
          <Button type="button" variant="secondary" onPress={() => void signIn({ demoRole: "student" })}>Use Student</Button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Both accounts share the Development classroom. Create an assignment as Teacher, then switch to Student to join a group.</p>
      </div>
      </fieldset>
    </form>
  );
}
