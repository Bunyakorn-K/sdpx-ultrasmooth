import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === "[SENSITIVE]") {
  console.error(
    "Set a valid DATABASE_URL first (cannot be empty or [SENSITIVE]).",
  );
  process.exit(1);
}

let connection;
try {
  const statements = (
    await readFile(new URL("./schema.sql", import.meta.url), "utf8")
  )
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  connection = postgres(process.env.DATABASE_URL, { max: 1 });
  await connection.begin(async (transaction) => {
    for (const statement of statements) await transaction.unsafe(statement);
  });
  console.log("Database tables and indexes are ready.");
} catch (error) {
  console.error(
    "Database initialization failed. Check the connection and database permissions.",
    error?.message || error,
  );
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
}
