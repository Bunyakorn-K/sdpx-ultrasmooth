# Lakebase Postgres connectivity check

Run `bun run db:smoke` with `DATABASE_URL` injected into the process environment.
The script uses the project's existing Drizzle ORM and Postgres driver with TLS.
It creates a temporary table, inserts a synthetic row, selects and verifies it,
then removes the table automatically at transaction commit. No application
migrations or persistent data are changed. Only the synthetic result is printed;
connection strings and raw driver errors are never logged.

For Neon, link the chosen project with `neon link --project-id <project-id>
--no-env-pull -y`. Use `neon checkout paireval-smoke --create --no-env-pull`
for an isolated development branch. Inject that branch's connection string at
runtime rather than saving credentials in project files. Do not pass credentials
as command-line arguments or commit them.
