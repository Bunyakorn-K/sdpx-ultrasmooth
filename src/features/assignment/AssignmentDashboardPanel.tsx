"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";

import { useHydrated } from "#/lib/use-hydrated";
import { votingState } from "#/services/voting-rules";

import { AssignmentQuestions } from "./AssignmentQuestions";

interface AssignmentData {
  id: number;
  name: string;
  status: "DRAFT" | "PUBLISHED";
  groupMaxScore: string;
  deadlineUtc: string | null;
}

interface Readiness {
  ready: boolean;
  questionCount: number;
  groupCount: number;
  message: string;
}

export function AssignmentDashboardPanel({ assignment: initial }: { assignment: AssignmentData }) {
  const router = useRouter();
  // The closing time is shown in the viewer's timezone, which the server does not know.
  const hydrated = useHydrated();
  const [assignment, setAssignment] = useState(initial);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [name, setName] = useState(initial.name);
  const [groupMaxScore, setGroupMaxScore] = useState(initial.groupMaxScore);
  const [deadline, setDeadline] = useState(initial.deadlineUtc ? initial.deadlineUtc.slice(0, 16) : "");
  const [savePending, setSavePending] = useState(false);

  function loadReadiness() {
    fetch(`/api/assignments/${assignment.id}/readiness`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body) => setReadiness(body.readiness))
      .catch(() => setReadiness(null));
  }

  useEffect(loadReadiness, [assignment.id]);
  // Group joins change readiness, so keep it current while the teacher waits to start voting.
  useEffect(() => {
    if (assignment.status !== "DRAFT") return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") loadReadiness(); }, 10_000);
    return () => window.clearInterval(timer);
  }, [assignment.id, assignment.status]); // eslint-disable-line react-hooks/exhaustive-deps

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
      loadReadiness();
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    const response = await fetch(`/api/assignments/${assignment.id}/publish`, { method: "POST" });
    const body = await response.json().catch(() => null);
    setPublishing(false);

    if (!response.ok) {
      setPublishError(body?.error?.message ?? "Could not start voting.");
      setReadiness(body?.error?.details ?? readiness);
      return;
    }

    setReadiness(body.readiness);
    setAssignment((prev) => ({ ...prev, status: "PUBLISHED" }));
    router.refresh();
  }

  async function handleEndVoting() {
    if (!window.confirm("End voting now? Students can no longer add or change scores.")) return;
    setPublishing(true);
    setPublishError(null);
    const response = await fetch(`/api/assignments/${assignment.id}/close`, { method: "POST" });
    setPublishing(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setPublishError(body?.error?.message ?? "Could not end voting.");
      return;
    }
    setAssignment((prev) => ({ ...prev, deadlineUtc: new Date().toISOString() }));
    router.refresh();
  }

  const isDraft = assignment.status === "DRAFT";
  const state = votingState({ status: assignment.status,
    deadlineUtc: assignment.deadlineUtc ? new Date(assignment.deadlineUtc) : null });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">Edit assignment</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label htmlFor="assignment-name" className="text-sm font-medium">Assignment name</label>
          <input
            id="assignment-name"
            aria-describedby="assignment-name-help"
            type="text"
            value={name}
            disabled={!isDraft}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-black/12 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:opacity-50 dark:border-white/15 dark:bg-zinc-950"
          />
          <p id="assignment-name-help" className="text-xs leading-5 text-slate-500">The title students see in their classroom and assignment workspace.</p>
          <div className="flex flex-col gap-3">
            <label htmlFor="assignment-deadline" className="text-sm font-medium">Voting deadline (local time)</label>
            <input
              id="assignment-deadline"
              aria-describedby="assignment-deadline-help"
              type="datetime-local"
              value={deadline}
              disabled={!isDraft}
              onChange={(e) => setDeadline(e.target.value)}
              className="flex-1 rounded-lg border border-black/12 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:opacity-50 dark:border-white/15 dark:bg-zinc-950"
            />
            <p id="assignment-deadline-help" className="text-xs leading-5 text-slate-500">Voting and group changes close at this date and time in your local timezone. Leave blank for no deadline.</p>
            <label htmlFor="assignment-max-score" className="text-sm font-medium">Maximum group score</label>
            <input
              id="assignment-max-score"
              aria-describedby="assignment-max-score-help"
              type="number"
              min={0}
              value={groupMaxScore}
              disabled={!isDraft}
              onChange={(e) => setGroupMaxScore(e.target.value)}
              className="w-full rounded-lg border border-black/12 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:opacity-50 dark:border-white/15 dark:bg-zinc-950"
            />
            <p id="assignment-max-score-help" className="text-xs leading-5 text-slate-500">The maximum points used to scale group voting results, for example 100 points.</p>
          </div>
          {!isDraft && <p className="text-xs leading-5 text-slate-500">These settings are locked once voting starts.</p>}
          {isDraft && (
            <Button type="submit" size="sm" variant="secondary" isDisabled={savePending}>
              {savePending ? "Saving…" : "Save"}
            </Button>
          )}
        </form>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">Voting</h2>
        <AssignmentQuestions assignmentId={assignment.id} editable={isDraft} onChange={loadReadiness} />
        {isDraft && <button type="button" onClick={loadReadiness} className="self-start text-xs text-emerald-800 underline">Refresh readiness</button>}
        {readiness ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <span
              className={`mr-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                readiness.ready
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              }`}
            >
              {readiness.ready ? "READY" : "NOT READY"}
            </span>
            {readiness.message}
          </p>
        ) : (
          <p className="text-sm text-zinc-500">Calculating…</p>
        )}
        {publishError && <p className="text-sm text-red-600 dark:text-red-400">{publishError}</p>}
        {isDraft ? (
          <Button
            size="sm"
            variant="primary"
            isDisabled={publishing || !readiness?.ready}
            onPress={handlePublish}
          >
            {publishing ? "Starting…" : "Start voting"}
          </Button>
        ) : state === "OPEN" ? (
          <>
            <p className="text-sm text-zinc-500">Voting is open.</p>
            <Button size="sm" variant="secondary" isDisabled={publishing} onPress={handleEndVoting}>
              {publishing ? "Ending…" : "End voting"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Voting closed{hydrated && assignment.deadlineUtc ? ` on ${new Date(assignment.deadlineUtc).toLocaleString()}` : ""}. The results below are final.
          </p>
        )}
      </div>
    </div>
  );
}
