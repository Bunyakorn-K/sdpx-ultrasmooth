import type { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "#/db/schema";

// Falls back to compose.yaml's local dev credentials (same pattern as
// drizzle.config.ts) instead of throwing at import time — pure modules that
// happen to import something from this file (e.g. roster-service.ts, whose
// CSV validation never touches the DB) shouldn't crash in contexts like
// Vitest that don't load .env.
const connectionString = process.env.DATABASE_URL ?? "postgres://user:pass@localhost:5432/paireval";

const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });

// Accepted by service functions that may run either directly against `db`
// or inside a `db.transaction(async (tx) => ...)` callback (e.g. roster
// import needs atomicity across multiple inserts).
export type DbClient =
  | typeof db
  | PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;
