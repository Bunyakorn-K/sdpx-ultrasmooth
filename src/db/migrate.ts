import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
}

async function main() {
  const migrationClient = postgres(connectionString!, { max: 1 });
  await migrate(drizzle(migrationClient), { migrationsFolder: "./src/db/migrations" });
  await migrationClient.end();
  console.log("Migrations applied.");
}

main().catch(() => {
  console.error("Migration failed. Verify database access and migration state; connection details are hidden.");
  process.exit(1);
});
