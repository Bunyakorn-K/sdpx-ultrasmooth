"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteClassroomButton({ classroomId, name }: { classroomId: number; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (pending || !window.confirm(`Delete "${name}"? All assignments, groups, votes, and results in this classroom will be permanently deleted. User accounts will remain.`)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/classrooms/${classroomId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      router.push("/classrooms");
      router.refresh();
    } catch { setError("Could not delete the classroom. Please try again."); setPending(false); }
  }
  return <div className="flex shrink-0 flex-col items-end">
    <button type="button" disabled={pending} onClick={remove} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6" /></svg>
      {pending ? "Deleting…" : "Delete classroom"}
    </button>
    {error && <p role="alert" className="mt-2 max-w-40 text-right text-xs text-red-700">{error}</p>}
  </div>;
}
