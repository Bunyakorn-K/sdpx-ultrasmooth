import type { StudentProgress } from "#/services/report-service";

/** Teacher view: who has finished scoring, so the teacher knows when to end voting. */
export function VotingProgress({ progress }: { progress: StudentProgress[] }) {
  const finished = progress.filter((student) => student.expected > 0 && student.given >= student.expected).length;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold">Voting progress</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{finished} of {progress.length} students finished</p>
      </div>
      {progress.length === 0 ? (
        <p className="text-sm text-zinc-500">No students have joined yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-zinc-500 dark:border-white/12">
                <th className="py-2 pr-4">Student</th>
                <th className="py-2 pr-4">Scores given</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {progress.map((student) => {
                const done = student.expected > 0 && student.given >= student.expected;
                return (
                  <tr key={student.userId} className="border-b border-black/5 last:border-0 dark:border-white/8">
                    <td className="py-2 pr-4">{student.name}</td>
                    <td className="py-2 pr-4">{student.given} / {student.expected}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${done
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                        {done ? "Done" : student.given === 0 ? "Not started" : "In progress"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
