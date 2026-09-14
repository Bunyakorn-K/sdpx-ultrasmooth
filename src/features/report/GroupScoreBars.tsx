export function GroupScoreBars({
  criterionName,
  weightedScore,
  maxScore,
}: {
  criterionName: string;
  weightedScore: number;
  maxScore: number;
}) {
  const bars = [
    { label: criterionName, value: weightedScore, max: maxScore },
    { label: "รวม", value: weightedScore, max: maxScore },
  ];

  return (
    <div className="flex items-end justify-center gap-8 py-4">
      {bars.map((bar, index) => {
        const heightPct = bar.max > 0 ? Math.max(4, (bar.value / bar.max) * 100) : 4;
        return (
          <div key={index} className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium">{bar.value.toFixed(1)}</span>
            <div className="flex h-28 w-10 items-end rounded-md bg-zinc-100 dark:bg-zinc-900">
              <div
                className="w-full rounded-md bg-indigo-500"
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500">{bar.label}</span>
          </div>
        );
      })}
    </div>
  );
}
