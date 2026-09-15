const SIZE = 96;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ParticipationRing({ assigned, submitted }: { assigned: number; submitted: number }) {
  const ratio = assigned > 0 ? submitted / assigned : 0;
  const offset = CIRCUMFERENCE * (1 - ratio);

  return (
    <div className="flex items-center gap-4">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Participation ${submitted} of ${assigned}`}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-zinc-200 dark:text-zinc-800"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className="text-indigo-600 dark:text-indigo-400"
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-current text-lg font-semibold">
          {Math.round(ratio * 100)}%
        </text>
      </svg>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          ประเมินเพื่อน {submitted}/{assigned} คู่ ({Math.round(ratio * 100)}%)
        </p>
      </div>
    </div>
  );
}
