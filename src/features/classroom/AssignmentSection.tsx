"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";

interface AssignmentRow {
  id: number;
  name: string;
  status: "DRAFT" | "PUBLISHED";
}

export function AssignmentSection({ classroomId }: { classroomId: number }) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<AssignmentRow[] | null>(null);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/classrooms/${classroomId}/assignments`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body) => setAssignments(body.assignments))
      .catch(() => setAssignments([]));
  }

  useEffect(load, [classroomId]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch(`/api/classrooms/${classroomId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await response.json().catch(() => null);
    setPending(false);

    if (!response.ok) {
      setError(body?.error?.message ?? "Could not create assignment.");
      return;
    }

    setName("");
    router.push(`/classrooms/${classroomId}/assignments/${body.id}`);
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold">Assignments</h2>

      {assignments === null && <p className="text-sm text-zinc-500">Loading…</p>}
      {assignments !== null && assignments.length === 0 && (
        <p className="text-sm text-zinc-500">No assignments yet.</p>
      )}
      {assignments && assignments.length > 0 && (
        <ul className="flex flex-col gap-2">
          {assignments.map((assignment) => (
            <li key={assignment.id}>
              <Link
                href={`/classrooms/${classroomId}/assignments/${assignment.id}`}
                className="flex items-center justify-between rounded-lg border border-black/8 px-3 py-2 text-sm transition-colors hover:border-indigo-400 dark:border-white/10"
              >
                <span>{assignment.name}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                  {assignment.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="flex items-center gap-2 border-t border-black/8 pt-3 dark:border-white/10">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New assignment name"
          className="flex-1 rounded-lg border border-black/12 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-950"
        />
        <Button type="submit" size="sm" variant="primary" isDisabled={pending}>
          Create
        </Button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
