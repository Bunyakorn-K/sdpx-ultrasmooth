"use client";

import { useEffect, useState } from "react";
import { Chip } from "@heroui/react";
import { ParticipationRing } from "#/features/report/ParticipationRing";
import { GroupScoreBars } from "#/features/report/GroupScoreBars";

interface StudentReport {
  groupScore: {
    groupName: string;
    weightedScore: number;
    comparisonCount: number;
    lowConfidence: boolean;
  } | null;
  maxScore: number;
  criterionName: string;
  participation: { assigned: number; submitted: number };
}

export function StudentReportPanel({ assignmentId }: { assignmentId: number }) {
  const [report, setReport] = useState<StudentReport | null>(null);

  useEffect(() => {
    fetch(`/api/assignments/${assignmentId}/my-report`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(setReport)
      .catch(() => setReport(null));
  }, [assignmentId]);

  if (!report) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold">Participation</h2>
        <ParticipationRing assigned={report.participation.assigned} submitted={report.participation.submitted} />
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-4 text-center dark:border-white/12 dark:bg-zinc-950">
        <div className="mb-2 flex items-center justify-center gap-2">
          <h2 className="text-sm font-semibold">Group score — {report.groupScore?.groupName ?? "—"}</h2>
          <Chip size="sm" variant="soft" color="warning">
            ชั่วคราว — อาจเปลี่ยนแปลงได้
          </Chip>
        </div>
        {report.groupScore ? (
          <>
            <GroupScoreBars
              criterionName={report.criterionName}
              weightedScore={report.groupScore.weightedScore}
              maxScore={report.maxScore}
            />
            {report.groupScore.lowConfidence && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ยังมีจำนวนการเปรียบเทียบไม่มากพอ ({report.groupScore.comparisonCount} ครั้ง) — คะแนนอาจเปลี่ยนแปลงได้มาก
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-zinc-500">You&apos;re not assigned to a group in this classroom.</p>
        )}
      </div>
    </div>
  );
}
