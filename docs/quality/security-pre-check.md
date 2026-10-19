# Security pre-check — 2026-10-19

## Fixed in this change

| Problem | Fix | Regression evidence |
| --- | --- | --- |
| Unsigned user-ID cookie impersonation | Managed session boundary; fixture endpoint opt-in and production-disabled | `auth-session.test.ts`, `access-rules.test.ts` |
| Student access to voting results | Teacher-only score/report APIs; student progress page contains completion counts only | `results-access.test.ts`, assignment-group E2E |
| Roster-account takeover by unverified email | Unique managed subject; verified-only linking and no subject replacement | Real Postgres workflow verification |
| Cross-assignment groups and late enrollment | Scoped membership; assignment-row locking shared with publication | Real Postgres workflow and group E2E |
| Self-votes / another user's vote / expired votes | Server checks assignment, classroom role, ownership, group exclusion and deadline | Voting-rule unit tests and group E2E |
| Unsafe submission links | Only optional HTTPS links accepted; user text rendered as text | Group-rule tests |
| Dependency advisories | Next.js 16.4.2; Vitest/coverage 4.1.12; Drizzle Kit 0.31.11; patched PostCSS and source-map-js resolutions | Fresh `bun audit --json` has no high/critical advisories |

## Remaining advisory

`bun audit --json` still reports one moderate advisory:
[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
in the old esbuild nested under Drizzle Kit's legacy `@esbuild-kit/esm-loader`.
The vulnerable esbuild development-server API is not used by application request
handlers. Next.js and Vitest use newer tooling. Do not expose that legacy server.
A forced cross-minor esbuild override is deferred because it would replace a
pre-1.0 API outside the loader's compatibility range. Track an upstream loader
replacement rather than reporting the dependency tree as clean.

## Checks and limits

- Application queries use Drizzle bindings rather than concatenating user SQL.
- Teacher access is verified at each affected resource boundary, even if navigation
  or the page proxy is bypassed. Registration never accepts a role grant.
- Group HTTP logs include event, correlation ID, route pattern and elapsed time;
  they do not include bodies, emails, cookies or connection strings. Root and
  nested password/token/email fields are redacted by Pino configuration.
- Raw auth/database exceptions are not printed by the new auth/group paths or
  verification scripts. Auth SDK server console logging is disabled.
- `/api/test/seed`, `/api/test/cleanup`, and legacy sign-in are disabled in production.
- Only `.env.example` is tracked among `.env*` paths. A targeted history query found
  no tracked `.env`, `.env.local`, or `.env.production` commits. This is not a
  comprehensive scan of all historical secret formats.
- Remote Dependabot, CodeQL, branch protection, deployed environment variables,
  OAuth/SMTP configuration and full Git-history secret scanning remain unverified.
- The Auth SDK is a beta package. Build/type/unit checks do not replace a real
  configured-branch signup/session test, which remains pending Neon sign-in.

## OWASP risks addressed

Broken access control (student results and cross-assignment references),
authentication failures (raw-cookie identity and unverified linking), and
vulnerable/outdated components (audited dependency updates).
