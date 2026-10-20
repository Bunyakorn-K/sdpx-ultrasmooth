"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";

interface AssignmentRow {
  id: number;
  name: string;
  status: "DRAFT" | "PUBLISHED";
  deadlineUtc: string | null;
  classroomId: number;
  role: "INSTRUCTOR" | "STUDENT";
  joinCode?: string;
}

const inputClass = "rounded-lg border border-black/12 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-950";

function assignmentHref(row: AssignmentRow) {
  const base = `/classrooms/${row.classroomId}/assignments/${row.id}`;
  return row.role === "INSTRUCTOR" ? base : `${base}/groups`;
}

export function AssignmentHome({ teacher }: { teacher: boolean }) {
  const [rows, setRows] = useState<AssignmentRow[] | null>(null);

  useEffect(() => {
    fetch("/api/assignments")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body) => setRows(body.assignments))
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {teacher ? <CreateAssignmentForm /> : <JoinAssignmentForm />}
      <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">Your assignments</h2>
        {rows === null && <p className="text-sm text-zinc-500">Loading…</p>}
        {rows?.length === 0 && (
          <p className="text-sm text-zinc-500">{teacher ? "No assignments yet. Create one above." : "No assignments yet. Enter the join code from your teacher."}</p>
        )}
        <ul className="flex flex-col gap-2">
          {rows?.map((row) => (
            <li key={row.id}>
              <Link href={assignmentHref(row)} className="flex items-center justify-between gap-3 rounded-lg border border-black/8 px-3 py-2 text-sm hover:border-indigo-400 dark:border-white/10">
                <span className="font-medium">{row.name}</span>
                <span className="flex items-center gap-2 text-xs text-zinc-500">
                  {row.joinCode && <code className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-900">{row.joinCode}</code>}
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-900">{row.status === "PUBLISHED" ? "Voting open" : "Forming groups"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CreateAssignmentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/assignments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, deadlineUtc: deadline ? new Date(deadline).toISOString() : null }),
    });
    const body = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) { setError(body?.error?.message ?? "Could not create the assignment."); return; }
    router.push(`/classrooms/${body.classroomId}/assignments/${body.id}`);
  }

  return (
    <form onSubmit={create} className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold">New assignment</h2>
      <label htmlFor="new-assignment-name" className="text-sm font-medium">Assignment name</label>
      <input id="new-assignment-name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Project pitch" className={inputClass} />
      <label htmlFor="new-assignment-deadline" className="text-sm font-medium">Voting deadline (optional, local time)</label>
      <input id="new-assignment-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
      <p className="text-xs text-slate-500">You get a join code for students. Add groups and voting questions on the next page.</p>
      <Button type="submit" size="sm" variant="primary" isDisabled={pending || !name.trim()}>{pending ? "Creating…" : "Create assignment"}</Button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

function JoinAssignmentForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function join(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/classrooms/join", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    setPending(false);
    if (!response?.ok) { setError(body?.error?.message ?? "Could not join. Please try again."); return; }
    if (body.assignmentId) router.push(`/classrooms/${body.classroomId}/assignments/${body.assignmentId}/groups`);
    else router.refresh();
  }

  return (
    <form onSubmit={join} className="flex flex-col gap-3 rounded-2xl border border-emerald-900/10 bg-emerald-50 p-6 text-slate-800">
      <h2 className="font-serif text-2xl">Join an assignment</h2>
      <label htmlFor="join-code" className="text-sm">Join code from your teacher</label>
      <input id="join-code" required maxLength={150} value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} />
      <button disabled={pending} className="self-start rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white">{pending ? "Joining…" : "Join"}</button>
      {error && <p role="alert" className="text-sm">{error}</p>}
    </form>
  );
}
