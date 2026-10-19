# PairEval

PairEval supports two roles, **teacher** and **student**, for assignment-based
group work and pairwise voting. Teachers create classrooms and assignments,
students enroll in assignment groups, and only classroom teachers can read results.
The landing page follows `public/design.jpg` with a light, pastel editorial style.

## Current implementation

- Next.js 16.4.2 / React 19.2.4 / strict TypeScript / Tailwind 4.
- Existing landing and demo routes use Pages Router; product routes use App Router.
- Drizzle ORM and the existing `postgres` driver own the application schema.
- Managed Better Auth is integrated through Neon's SDK. Live provisioning and
  real signup verification still require an authenticated Neon project.
- `INSTRUCTOR` remains the database spelling of teacher; no admin role exists.
- TanStack Query, Jotai, and Remeda are future options, not installed features.

## Run locally

```bash
bun install --frozen-lockfile
docker compose up -d db
# Inject environment variables from your secret manager/runtime.
bun run db:migrate
bun dev
```

Open http://localhost:3000. See `.env.example` for variable names and
[Neon setup](docs/neon-setup.md) for secret-free provisioning and live verification.
`DATABASE_URL_UNPOOLED` is preferred for migrations. New users are students;
`TEACHER_AUTH_IDS` controls teacher eligibility on the server. A teacher creates
and shares a classroom invitation code; students join and choose/create groups
before voting is published. Existing roster CSV import remains available.

`bun dev` enables local fixture sign-in by default and binds to 127.0.0.1.
At `/sign-in`, choose **Use Teacher** or **Use Student** (no password).
This creates `teacher@paireval.test`, `student@paireval.test`, and their shared
**Development classroom** on first use. Data persists in your local database;
groups are still created only within an assignment. Start the local database
above and apply migrations using its connection settings from `.env.example`.
Set `ENABLE_DEV_AUTH=0` at runtime to use managed Neon Auth instead.

Never save real credentials in project files, logs, screenshots, or Git. The
non-production `ENABLE_DEV_AUTH=1` fixture mode is only for disposable
local regression databases; it preserves historical demo identity behavior and
is not a managed Auth test or a safe shared deployment configuration.

## Verification

```bash
bun run test
bun run lint
bun run build
bun run test:coverage
bun run test:e2e
# Disposable database named paireval_test, with ALLOW_TEST_DATABASE=1:
bun run test:workflows
# Real managed Auth, configured app, verification-ready test mailbox if required:
bun run test:auth:live
```

Historical browser tests require explicit fixture auth against a disposable
Postgres database. Managed signup/session proof is a separate live check and
must not be inferred from those tests. See [WS evidence](docs/ws-01-08-status.md)
and [story drafts](docs/backlog.md) for scope and remaining external evidence.

## Docker

```bash
docker compose up
docker compose -f compose.test.yaml up unit --abort-on-container-exit --exit-code-from unit
docker compose -f compose.test.yaml --profile e2e up e2e --abort-on-container-exit --exit-code-from e2e
# Remove only this Compose project's disposable test resources when finished:
docker compose -f compose.test.yaml down -v
```

The test database uses tmpfs. Docker dev runs committed migrations before Next.
Auth environment variables must still be injected for managed sign-in. Docker
browser tests deliberately enable fixture identity only in their isolated service.

## Deployment

Vercel is the selected host. Recorded production/staging URLs are historical
metadata, not evidence that this change has been deployed. No commit, push,
remote configuration change, or deployment is performed by local verification.
