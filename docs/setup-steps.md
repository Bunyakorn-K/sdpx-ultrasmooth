# Environment Loop — WS05

## Before

Manual host setup required Node/npm, dependency install, database creation, connection configuration, schema initialization, browser install, application start and separate test commands. No honest wall-clock baseline was recorded before automation; no invented minutes are assigned.

## After — development

```sh
docker compose up --build
```

This starts PostgreSQL 17, initializes the schema and starts the application. Local/test Compose passwords are clearly disposable defaults, not actual Neon credentials. Replace `LOCAL_DB_PASSWORD` for a non-disposable development environment. Neon remains the production driver.

The root bind mount supplies source; named dependency/build volumes preserve container-specific files. PostgreSQL data persists only for the development profile. This command must be run from a separate checkout or with adjusted ports when an existing user dev server occupies port 3000.

## After — disposable tests

```sh
docker compose -f compose.test.yaml up unit --build --abort-on-container-exit --exit-code-from unit
docker compose -f compose.test.yaml --profile e2e up e2e --build --abort-on-container-exit --exit-code-from e2e
docker compose -f compose.test.yaml down -v
```

Unit coverage/JUnit output and E2E reports have explicit writable mounts; source is read-only for container unit tests. The test database uses tmpfs and is lost on stop. The E2E image installs Chromium matching the lockfile.

## Host verification

```sh
npm ci
npx playwright install chromium
npm run db:init
npm test
npm run test:e2e
```

Host browser tests use port 3100 and `.next-e2e` to avoid stopping an existing user server. `BASE_URL` opts into an already running server and disables automatic startup. E2E credentials are generated in memory; seed/cleanup require a separate test-only token.

## Measurements and limits

Actual container build/test verification is recorded in `docs/lab-status.md` and `docs/loop-metrics.md`. First image build includes package/browser downloads and is network-dependent. No claim is made that every team member has cloned or run this checkout.
