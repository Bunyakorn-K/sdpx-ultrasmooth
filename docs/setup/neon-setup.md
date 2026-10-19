# Managed Better Auth setup

## Status

The application uses `@neondatabase/auth` (0.6.0-beta) for managed Better Auth.
The CLI and Codex skills/OAuth MCP tooling were installed with `neon init`.
At the last check, the CLI had no authenticated account and this workspace had
no linked project. Managed provisioning and a real user round-trip remain pending.
No local fixture or mocked test counts as proof of managed Auth.

## Finish provisioning

The HTTPS `/neondb/auth` endpoint belongs in runtime `NEON_AUTH_BASE_URL`.
It is not a PostgreSQL connection string. `DATABASE_URL` and a random
`NEON_AUTH_COOKIE_SECRET` of at least 32 characters are still required.
Keep all credentials in runtime/deployment settings.

CI's `test:workflows` verifies application data and identity linking against
its disposable PostgreSQL service, without contacting managed Auth. Run that
step with `ALLOW_TEST_DATABASE=1` and `ENABLE_DEV_AUTH=0`; only browser fixture
tests use `ENABLE_DEV_AUTH=1`. Live managed signup remains a separate check.

1. A human runs `neon login` and selects the organization/project. Do not paste
   API keys or connection strings into chat. Do not launch unattended login.
2. Confirm the target project uses AWS without IP Allow or Private Networking.
   Keep existing network restrictions intact if Auth cannot be enabled.
3. Tooling is already installed. Link the chosen project using
   `neon link --project-id <project-id> --no-env-pull -y`.
4. Use an isolated branch: `neon checkout dev-paireval-auth --create --no-env-pull`.
   `neon.ts` declares only `auth: true`. Review `neon config plan` before applying.
   `neon init` and `neon deploy` normally pull env files; this repository instead
   requires runtime-only secrets. Use the CLI's supported no-pull option when
   available, or `neon neon-auth enable` for this linked branch, then confirm
   `neon neon-auth status`. Do not weaken network restrictions or enable Data API.
5. Inject `DATABASE_URL`, the direct `DATABASE_URL_UNPOOLED`, the branch's
   `NEON_AUTH_BASE_URL`, and a random `NEON_AUTH_COOKIE_SECRET` of at least 32
   characters. Use a secret manager, runtime environment, or `@neon/env` runtime
   injection. Never echo values or write them to project files. The placeholder
   `.env.example` documents names only.
6. Apply the committed application migrations with `bun run db:migrate`.
   Neon owns `neon_auth`; Drizzle owns the public application schema.
7. Put authorized teachers' managed Auth subject IDs in `TEACHER_AUTH_IDS`
   (comma separated, server-only). New identities are students. A browser-supplied
   role never grants teacher access. Teachers can manage only their classrooms.
8. Keep `ENABLE_DEV_AUTH=0`. Run `bun dev`, visit `/sign-up`, and verify a real
   test signup. `bun run test:auth:live` performs signup, session readback, reload,
   denied classroom creation for a student, sign-out, and sign-in without printing
   credentials or saving browser state. Its test password is random and memory-only.
   It leaves a synthetic account on the selected test branch; delete that branch
   after review if it is no longer needed.

The live check uses an `example.com` synthetic address unless `AUTH_TEST_EMAIL`
is injected. If verification is required, use a controlled mailbox and complete
the configured verification flow; do not disable verification to force a pass.
Verification delivery has not been exercised. Configure custom SMTP for production
and register actual deployment origins on the correct branch. No production
deployment, Google OAuth setup, or email-delivery verification is implied here.

## Identity and permissions

Managed sessions are checked at the server boundary, not through localStorage.
Application users are bound to unique managed subject IDs. A roster account is
linked by email only after Neon reports that email verified. Unverified identities
cannot claim existing users or classroom privileges. Email normalization preserves
dots and plus tags because university mailboxes may distinguish them.

The explicit `ENABLE_DEV_AUTH=1` escape hatch exists only for isolated historical
regression tests. It preserves the old test convention that any fixture identity
can create a classroom; it does not test managed teacher assignment. Production
ignores the flag. Never enable it on a shared deployment or real student database.

## References

- [Neon skill](https://neon.com/.well-known/agent-skills/neon/SKILL.md)
- [Auth skill](https://neon.com/docs/ai/skills/neon-auth/SKILL.md)
- [Managed integration reference](https://neon.com/docs/ai/skills/neon-auth/references/managed-auth.md)
- [Next.js API quickstart](https://neon.com/docs/auth/quick-start/nextjs-api-only.md)
