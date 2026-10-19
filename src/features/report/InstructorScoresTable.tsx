"use client";

import { useEffect, useState } from "react";

interface GroupScoreRow {
  groupId: number;
  groupName: string;
  questions: { questionId: number; average: number | null; count: number }[];
  average: number | null;
  raterCount: number;
  weightedScore: number;
}

interface Results {
  rows: GroupScoreRow[];
  maxScore: number;
  questions: { id: number; text: string }[];
}

const show = (value: number | null) => (value === null ? "—" : value.toFixed(2));

export function InstructorScoresTable({ assignmentId, published }: { assignmentId: number; published: boolean }) {
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    if (!published) return;
    const load = () => fetch(`/api/assignments/${assignmentId}/scores`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(setResults)
      .catch(() => setResults({ rows: [], maxScore: 0, questions: [] }));
    load();
    // Votes keep arriving while voting is open.
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [assignmentId, published]);

  if (!published) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold">Voting results (average of 1–5)</h2>
      {results === null && <p className="text-sm text-zinc-500">Loading…</p>}
      {results && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-zinc-500 dark:border-white/12">
                <th className="py-2 pr-4">Group</th>
                {results.questions.map((question, index) => (
                  <th key={question.id} className="py-2 pr-4" title={question.text}>Q{index + 1}</th>
                ))}
                <th className="py-2 pr-4">Average</th>
                <th className="py-2 pr-4">Voters</th>
                <th className="py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {results.rows.map((row) => (
                <tr key={row.groupId} className="border-b border-black/5 last:border-0 dark:border-white/8">
                  <td className="py-2 pr-4">{row.groupName}</td>
                  {row.questions.map((question) => <td key={question.questionId} className="py-2 pr-4">{show(question.average)}</td>)}
                  <td className="py-2 pr-4 font-medium">{show(row.average)}</td>
                  <td className="py-2 pr-4">{row.raterCount}</td>
                  <td className="py-2">{row.weightedScore.toFixed(1)} / {results.maxScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.questions.length > 0 && (
            <ol className="mt-2 list-decimal pl-5 text-xs text-zinc-500">
              {results.questions.map((question) => <li key={question.id}>{question.text}</li>)}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
