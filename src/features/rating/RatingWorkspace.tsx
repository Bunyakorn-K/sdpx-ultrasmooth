"use client";

import { useCallback, useEffect, useState } from "react";

interface Sheet {
  questions: { id: number; text: string }[];
  groups: { id: number; name: string; description: string | null; artifactUrl: string | null }[];
  ratings: { questionId: number; groupId: number; score: number }[];
}

const SCORES = [1, 2, 3, 4, 5] as const;
const key = (groupId: number, questionId: number) => `${groupId}:${questionId}`;

export function RatingWorkspace({ assignmentId }: { assignmentId: number }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/assignments/${assignmentId}/ratings`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body: Sheet) => {
        setSheet(body);
        setScores(new Map(body.ratings.map((rating) => [key(rating.groupId, rating.questionId), rating.score])));
      })
      .catch(() => setError("Could not load voting. Refresh to try again."));
  }, [assignmentId]);

  useEffect(load, [load]);

  async function rate(groupId: number, questionId: number, score: number) {
    const previous = scores.get(key(groupId, questionId));
    setScores((current) => new Map(current).set(key(groupId, questionId), score));
    setError(null);
    const response = await fetch(`/api/assignments/${assignmentId}/ratings`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, questionId, score }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Could not save your score.");
      // Roll back the optimistic choice so the page shows what is stored.
      setScores((current) => {
        const next = new Map(current);
        if (previous === undefined) next.delete(key(groupId, questionId));
        else next.set(key(groupId, questionId), previous);
        return next;
      });
    }
  }

  if (!sheet) return <p className="text-sm text-zinc-500">{error ?? "Loading…"}</p>;
  const total = sheet.questions.length * sheet.groups.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vote</h1>
        <p className="text-sm text-zinc-500" aria-live="polite">{scores.size} / {total} scored</p>
      </div>
      <p className="text-xs text-zinc-500">1 = poor, 5 = excellent. Scores save as you click, and you can change them until voting closes.</p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {sheet.groups.length === 0 && <p className="text-sm text-zinc-500">There are no other groups to score.</p>}
      {sheet.groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
          <div>
            <h2 className="font-semibold">{group.name}</h2>
            {group.description && <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{group.description}</p>}
            {group.artifactUrl && <a href={group.artifactUrl} target="_blank" rel="noreferrer" className="text-sm text-emerald-800 underline">Open submission ↗</a>}
          </div>
          {sheet.questions.map((question) => {
            const selected = scores.get(key(group.id, question.id));
            return (
              <fieldset key={question.id} className="flex flex-col gap-2">
                <legend className="text-sm">{question.text}</legend>
                <div className="flex gap-2">
                  {SCORES.map((score) => (
                    <button key={score} type="button" aria-pressed={selected === score}
                      aria-label={`${score} of 5`}
                      onClick={() => rate(group.id, question.id, score)}
                      className={`h-10 w-10 rounded-full border text-sm font-medium transition ${selected === score
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-black/15 hover:border-emerald-600 dark:border-white/20"}`}>
                      {score}
                    </button>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </section>
      ))}
    </div>
  );
}
