"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function JoinClassroomForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/classrooms/join", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error?.message ?? "Could not join classroom."); return; }
      router.push(`/classrooms/${body.classroomId}`);
      router.refresh();
    } catch { setMessage("Could not join classroom. Please try again."); } finally { setPending(false); }
  }
  return <form onSubmit={join} className="rounded-2xl border border-emerald-900/10 bg-emerald-50 p-6">
    <h2 className="mb-3 font-serif text-2xl">Join your classroom</h2>
    <label className="text-sm">Invitation code
      <input name="code" required maxLength={150} className="my-3 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
    </label>
    <button disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white">{pending ? "Joining…" : "Join classroom"}</button>
    {message && <p role="alert" className="mt-3 text-sm">{message}</p>}
  </form>;
}
