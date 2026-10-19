import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const client = postgres(connectionString, {
    max: 1,
    ssl: "require",
    connect_timeout: 15,
    idle_timeout: 5,
  });

  try {
    const db = drizzle(client);
    const rows = await db.transaction(async (tx) => {
      // Keep this connectivity check out of the persistent application schema.
      await tx.execute(sql`
        CREATE TEMPORARY TABLE lakebase_smoke (
          id integer PRIMARY KEY,
          message text NOT NULL
        ) ON COMMIT DROP
      `);
      await tx.execute(sql`
        INSERT INTO pg_temp.lakebase_smoke (id, message)
        VALUES (${1}, ${"Hello from PairEval on Lakebase Postgres!"})
      `);
      return tx.execute<{ id: number; message: string }>(sql`
        SELECT id, message FROM pg_temp.lakebase_smoke WHERE id = ${1}
      `);
    });

    if (rows.length !== 1 || rows[0].id !== 1 ||
        rows[0].message !== "Hello from PairEval on Lakebase Postgres!") {
      throw new Error("Database round-trip verification failed.");
    }
    console.log(JSON.stringify(rows[0], null, 2));
    console.log("Lakebase Postgres create/insert/read succeeded; temporary table removed.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch(() => {
  // Driver errors may contain connection details; never log the raw error.
  console.error("Database check failed. Verify DATABASE_URL, TLS, and database access.");
  process.exitCode = 1;
});
