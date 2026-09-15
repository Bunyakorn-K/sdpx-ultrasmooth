"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";

interface AssignmentData {
  id: number;
  name: string;
  status: "DRAFT" | "PUBLISHED";
  groupMaxScore: string;
  deadlineUtc: string | null;
}

interface Feasibility {
  feasible: boolean;
  totalPairs: number;
  coverageUsed: number;
  workloadPerEvaluator: number;
  reduced: boolean;
  message: string;
}

export function AssignmentDashboardPanel({ assignment: initial }: { assignment: AssignmentData }) {
  const router = useRouter();
  const [assignment, setAssignment] = useState(initial);
  const [feasibility, setFeasibility] = useState<Feasibility | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [name, setName] = useState(initial.name);
  const [groupMaxScore, setGroupMaxScore] = useState(initial.groupMaxScore);
  const [deadline, setDeadline] = useState(initial.deadlineUtc ? initial.deadlineUtc.slice(0, 16) : "");
  const [savePending, setSavePending] = useState(false);

  function loadFeasibility() {
    fetch(`/api/assignments/${assignment.id}/feasibility`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body) => setFeasibility(body.feasibility))
      .catch(() => setFeasibility(null));
  }

  useEffect(loadFeasibility, [assignment.id]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSavePending(true);
    const response = await fetch(`/api/assignments/${assignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        groupMaxScore: Number(groupMaxScore),
        deadlineUtc: deadline ? new Date(deadline).toISOString() : null,
      }),
    });
    setSavePending(false);
    if (response.ok) {
      const updated = await response.json();
      setAssignment(updated);
      loadFeasibility();
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    const response = await fetch(`/api/assignments/${assignment.id}/publish`, { method: "POST" });
    const body = await response.json().catch(() => null);
    setPublishing(false);

    if (!response.ok) {
      setPublishError(body?.error?.message ?? "Publish failed.");
      setFeasibility(body?.error?.details ?? feasibility);
      return;
    }

    setFeasibility(body.feasibility);
    setAssignment((prev) => ({ ...prev, status: "PUBLISHED" }));
    router.refresh();
  }

  const isDraft = assignment.status === "DRAFT";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">Edit assignment</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            disabled={!isDraft}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-black/12 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:opacity-50 dark:border-white/15 dark:bg-zinc-950"
          />
          <div className="flex gap-3">
            <input
              type="datetime-local"
              value={deadline}
              disabled={!isDraft}
              onChange={(e) => setDeadline(e.target.value)}
              className="flex-1 rounded-lg border border-black/12 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:opacity-50 dark:border-white/15 dark:bg-zinc-950"
            />
            <input
              type="number"
              min={0}
              value={groupMaxScore}
              disabled={!isDraft}
              onChange={(e) => setGroupMaxScore(e.target.value)}
              className="w-28 rounded-lg border border-black/12 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:opacity-50 dark:border-white/15 dark:bg-zinc-950"
            />
          </div>
          {isDraft && (
            <Button type="submit" size="sm" variant="secondary" isDisabled={savePending}>
              {savePending ? "Saving…" : "Save"}
            </Button>
          )}
        </form>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">Pair generation engine</h2>
        {feasibility ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <span
              className={`mr-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                feasibility.feasible
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              }`}
            >
              {feasibility.feasible ? "FEASIBLE" : "INFEASIBLE"}
            </span>
            {feasibility.message}
          </p>
        ) : (
          <p className="text-sm text-zinc-500">Calculating…</p>
        )}
        {publishError && <p className="text-sm text-red-600 dark:text-red-400">{publishError}</p>}
        {isDraft ? (
          <Button
            size="sm"
            variant="primary"
            isDisabled={publishing || !feasibility?.feasible}
            onPress={handlePublish}
          >
            {publishing ? "Publishing…" : "Publish & generate pairs"}
          </Button>
        ) : (
          <p className="text-sm text-zinc-500">Published — pairs have been generated.</p>
        )}
      </div>
    </div>
  );
}
