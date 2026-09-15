"use client";

import { useEffect, useState } from "react";

interface GroupScoreRow {
  groupId: number;
  groupName: string;
  qualityIndex: number;
  comparisonCount: number;
  weightedScore: number;
  lowConfidence: boolean;
}

export function InstructorScoresTable({ assignmentId, published }: { assignmentId: number; published: boolean }) {
  const [rows, setRows] = useState<GroupScoreRow[] | null>(null);
  const [maxScore, setMaxScore] = useState(0);

  useEffect(() => {
    if (!published) return;
    fetch(`/api/assignments/${assignmentId}/scores`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body) => {
        setRows(body.rows);
        setMaxScore(body.maxScore);
      })
      .catch(() => setRows([]));
  }, [assignmentId, published]);

  if (!published) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold">Group scores (ชั่วคราว — อาจเปลี่ยนแปลงได้)</h2>
      {rows === null && <p className="text-sm text-zinc-500">Loading…</p>}
      {rows && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-zinc-500 dark:border-white/12">
              <th className="py-2 pr-4">Group</th>
              <th className="py-2 pr-4">Comparisons</th>
              <th className="py-2 pr-4">Quality index</th>
              <th className="py-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.groupId} className="border-b border-black/5 last:border-0 dark:border-white/8">
                <td className="py-2 pr-4">{row.groupName}</td>
                <td className="py-2 pr-4">
                  {row.comparisonCount}
                  {row.lowConfidence && (
                    <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      LOW_CONFIDENCE
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4">{row.qualityIndex.toFixed(3)}</td>
                <td className="py-2">
                  {row.weightedScore.toFixed(1)} / {maxScore}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
