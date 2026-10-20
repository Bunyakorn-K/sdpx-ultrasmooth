# Peerly — Agent Guidance

## Project

ระบบประเมินผลงานระหว่างกลุ่มสำหรับครูและนักเรียน รายละเอียด: `memory-bank/intent.md` และ `docs/backlog.md`.

## Setup & Commands

- Install: `npm ci` (Node.js 24)
- Local app + PostgreSQL: `docker compose up --build`
- Dev with configured Neon: `npm run dev`
- Schema: `npm run db:init`
- Unit/security tests: `npm test`
- Coverage: `npm run test:coverage`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- API contract: `npm run spec:lint`
- Build: `npm run build`
- Browser tests: `npm run test:e2e` (starts its own server; `BASE_URL` uses an existing server)
- Repeatability: `npm run test:e2e:repeat`
- Container unit: `docker compose -f compose.test.yaml up unit --build --abort-on-container-exit --exit-code-from unit`
- Container E2E: `docker compose -f compose.test.yaml --profile e2e up e2e --build --abort-on-container-exit --exit-code-from e2e`
- Teardown disposable tests: `docker compose -f compose.test.yaml down -v`
- Fidelity: `npm run test:fidelity` (temporarily disables one voting rule and restores it)

## Conventions

- TypeScript strict; feature based under `src/features/`, framework adapters under `src/app/`, shared utilities under `shared/`.
- MUI UI; use `shared/theme/theme.ts` and preserve the design reference in `public/design.jpg`.
- Keep components, domain rules, services and repositories separate. Inject repository interfaces into services.
- Prefer accessible role/label selectors; add `data-testid` for repeated cards and other elements without a stable role.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.
- Intended branch workflow: `feature/*` → PR into `develop` → `main`. Do not push, switch shared branches or change repository visibility without the user's authorized target.

## Rules for Agents

- Run relevant tests before and after a change; run lint, typecheck, OpenAPI validation and build before handoff.
- If a test is red, fix the implementation. Never delete/weaken an assertion to make it green.
- During a behavior-preserving refactor, do not modify its existing tests. Add characterization tests before starting if coverage is missing.
- Use parameterized SQL. Every protected read/mutation checks role, membership or ownership as appropriate.
- Never put real credentials, connection strings, cookies or tokens into source, documentation, logs or screenshots. `.env.example` contains names and empty values only. Disposable local test credentials are explicitly marked in Compose.
- Do not enable `/api/test/*` in production. Test data mutations also require an isolated `*_test` database, explicit opt-in and a test token.
- Read `memory-bank/` and applicable ADRs before changing architectural decisions. Ask before changing confirmed decisions unless the current user request already authorizes the change.
- Keep changes focused and reviewable; document any necessary scope expansion. The user has authorized implementing WS01–WS08 from `docs/labs/` for this task.
- Preserve the original `docs/labs/` instructions. Never invent team reviews, staging timings, CI success, GitHub issue links or deployment evidence.
- Record unverified/external requirements in `docs/lab-status.md` rather than marking them complete.

## Durable Memory

- Search relevant Mem0 context when its tools are available and prior decisions could affect a task.
- Store only confirmed reusable preferences/decisions; never store secrets or transient task state.
- Current user instructions and repository guidance override memories.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
