/**
 * FR-SCORE-06: Daily 02:00 classroom-timezone interim score recomputation.
 * Can be scheduled via cron (e.g. at 02:00 in classroom timezone) or run on demand.
 */
import { database } from "../src/shared/server/database.ts";
import { isInterimRecomputationDue } from "../src/features/pairwise/domain/interim-scheduler.ts";

async function main() {
  const sql = database();
  const rows = await sql`
    SELECT a.id, a.data, c.data as classroom_data
    FROM assignments a
    LEFT JOIN classrooms c ON c.id::text = a.data->>'classroomId'
    WHERE a.data->>'status' IN ('active', 'closed')
  `;

  let updatedCount = 0;
  const now = new Date();

  for (const row of rows) {
    const assignment = row.data;
    const timezone =
      row.classroom_data?.timezone || assignment.timezone || "Asia/Bangkok";

    if (isInterimRecomputationDue(assignment.lastInterimAt, timezone, now)) {
      assignment.lastInterimAt = now.toISOString();
      await sql`
        UPDATE assignments
        SET data = ${JSON.stringify(assignment)}::jsonb,
            version = version + 1
        WHERE id = ${row.id}
      `;
      updatedCount++;
    }
  }

  console.log(
    `[Interim Scores] Processed ${rows.length} assignments; recomputed ${updatedCount} at ${now.toISOString()}`,
  );
}

if (process.argv[1] && process.argv[1].endsWith("daily-interim-scores.mjs")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { main as recomputeAllInterimScores };
