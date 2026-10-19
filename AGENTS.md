<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PairEval Engineering Guide

## Product Overview

PairEval is a university peer-evaluation system where student groups score each other's work on a 5-point scale.

- Teacher: creates an assignment directly (there is no classroom step) and shares its join code, sets a deadline, manages groups, writes 1-5 voting questions, and presses Start voting. After voting the teacher sees each group's average score.
- Student: joins an assignment by code, creates or joins one group, and once voting is open scores every other group 1-5 on each question.

Each assignment owns a hidden classroom whose slug is the join code, so membership and role checks reuse `classroom_member`. Questions are stored in the `criterion` table and scores in the `rating` table. The old pairwise `pair_assignment` and `comparison` tables are kept only for historical data; no code reads them.

The repository contains a landing page, the assignment, group, question, rating and results workflows, PostgreSQL persistence, and teacher/student authorization. Neon managed Better Auth is integrated in code; provisioning and real signup verification remain pending authenticated setup. Keep local fixture verification separate from managed-service and production evidence.

## Sources of Truth

Use sources in this order when they disagree:

1. Live code, `package.json`, `bun.lock`, and executable verification.
2. This file for engineering policy and target architecture.
3. `memory-bank/standards/tech-stack.md` for approved product and stack decisions.
4. `README.md` for onboarding; it may lag behind the implementation.

Surface contradictions instead of silently choosing an interpretation. Keep current-state facts separate from planned architecture.

## Current Repository State

- Runtime: Next.js 16.4.2 and React 19.2.4 (Next.js updated for security fixes).
- Language: TypeScript 5 in strict, no-emit mode.
- Router: App Router for every product route; the legacy Pages Router under `src/pages` holds only the landing page plus `_app` and `_document`.
- Styling: Tailwind CSS 4 through `src/styles/globals.css`.
- Tooling: Bun is the package manager; `bun.lock` is the canonical lockfile.
- Configuration: React Compiler and React Strict Mode are enabled.
- Imports: `#/*` maps to `src/*`.
- Available scripts: `dev`, `build`, `start`, `test`, and `test:e2e`.
- `bun run test` runs Vitest unit tests; `bun run test:e2e` runs Playwright browser smoke tests.
- Local dev auth: `/api/auth/dev-sign-in` signs in by email. Because a new account with no memberships counts as a teacher, e2e tests pass `role: "student"` to seed extra students that then join assignments by code.

## Target Architecture

- Use the Next.js App Router for new product work and TypeScript across client and server code.
- Use Tailwind CSS for styling.
- Use Lakebase Postgres through Neon for persistence, per the owner's explicit hosting decision.
- Use Drizzle ORM as the only application-level database access layer and for schema migrations.
- Use Neon managed Better Auth for sessions, initially email/password. Google OAuth is not yet configured; do not create parallel sessions.
- Use TanStack Query for interactive client-side server state and cache synchronization.
- Use Jotai for local or cross-component UI state, not remote data or authenticated sessions.
- Use Remeda for non-trivial, pure data transformations when native methods would be less clear.
- Deploy on Vercel. Treat recorded deployment endpoints as metadata that must be verified before use.

Inspect `package.json` for installed libraries. TanStack Query, Jotai, and Remeda remain approved targets rather than implemented integrations. Install a library only when the task needs it, use its current official guidance, and keep `package.json` and `bun.lock` changes together.

## Router Transition Rules

- Treat `src/pages` as legacy code that remains supported during migration.
- Put new routes in `src/app`; do not add new Pages Router routes.
- Never define the same URL in both routers.
- Migrate one complete route at a time, preserving behavior, metadata, loading states, and error handling.
- Do not delete a legacy route until its App Router replacement has been verified.
- Use Server Components by default. Add `"use client"` only for browser APIs, event handlers, hooks, or client state.
- Use App Router Route Handlers (`route.ts`) for HTTP boundaries such as browser APIs, webhooks, or third-party integrations.
- Server Components and server-only modules should call application services directly rather than making internal HTTP requests.

If dependencies are absent, run `bun install --frozen-lockfile` before Next.js work so the version-matched guides under `node_modules/next/dist/docs/` are available. Read the relevant guide before changing routing, caching, data fetching, metadata, middleware, or configuration.

## Intended Project Layout

Existing paths remain valid until migrated. Create target paths only when required by an approved task.

```text
src/app/                 App Router routes, layouts, and route handlers
src/components/          Reusable presentation components
src/features/<feature>/  Feature-owned UI, queries, state, and domain logic
src/db/                  Drizzle client, schema, and migrations
src/lib/                 Shared server/client integrations, including auth
src/pages/               Legacy Pages Router routes during migration
src/styles/              Global styles
public/                  Static assets
memory-bank/             Product decisions and project standards
```

Keep feature-specific code together. Do not introduce a generic abstraction until at least two concrete callers need it.

## Data and State Boundaries

The target request flow is: UI → Server Component or interactive query → server boundary → domain logic → Drizzle → Lakebase Postgres.

- Keep Drizzle and privileged database credentials in server-only modules.
- Treat the Drizzle schema and committed migrations as the database source of truth; avoid untracked dashboard-only schema changes.
- Let Better Auth own identity, OAuth callbacks, sessions, and authorization context.
- Keep TanStack Query keys stable and invalidate the narrowest affected data after mutations.
- Keep Jotai atoms small and UI-focused. Prefer component state when state is not shared.
- Keep transformations pure and testable; use Remeda only when it improves readability.

## Development Commands

```bash
bun install --frozen-lockfile  # install exactly from bun.lock
bun dev                        # local development server
bun run lint                   # type-check and OpenAPI schema linting
bun run test                   # run Vitest unit test suite
bun run test:coverage          # generate test coverage report
bun run test:e2e               # run Playwright E2E smoke tests
bun run build                  # production build and type integration check
bun run start                  # serve a completed production build

# Docker & Environment Loop (WS-05)
docker compose up              # run app and database in one command
docker compose -f compose.test.yaml up unit --abort-on-container-exit --exit-code-from unit
docker compose -f compose.test.yaml --profile e2e up e2e --abort-on-container-exit --exit-code-from e2e
docker compose -f compose.test.yaml down -v
```

## Rules for Agents

- ต้องรัน test ให้เขียวก่อนเสนอ diff เสมอ
- ถ้า test แดง ให้แก้ code — ห้ามแก้หรือลบ test เพื่อให้ผ่าน
- ห้ามใส่ค่า secret ลงไฟล์ใด ๆ ใช้ env var เท่านั้น
- ห้ามแก้ `docs/adr/` และ `memory-bank/` โดยไม่ถามก่อน
- แก้ทีละเรื่อง — diff ที่เกิน ~200 บรรทัดให้หยุดถามก่อน

## Coding Standards

- Persist code, comments, documentation, and commit messages in English.
- Preserve strict TypeScript. Avoid `any`; narrow `unknown` at boundaries.
- Prefer `#/*` imports across top-level source directories and relative imports within a small local module.
- Keep Server and Client Component boundaries explicit; never expose secrets or server-only modules to client bundles.
- Use small components and functions with one clear responsibility.
- Match the existing use of double quotes and semicolons unless project formatting tooling later decides otherwise.
- Use Tailwind utilities consistently; avoid unrelated global CSS or design-system work.
- Comment why a non-obvious constraint exists, not what readable code already says.
- Do not import or write configuration for a target library before installing it.

## Security and Environment

- Never commit or print secrets, OAuth credentials, database URLs, session keys, or user data.
- `.env*` files are ignored. If an example file is introduced, explicitly allow `.env.example` in `.gitignore` and include placeholders only.
- Use least-privilege database credentials and never expose privileged access to the browser.
- Validate authorization at the server boundary; hiding UI is not access control.
- Use Husky for Git hooks and run `secretlint` before commits once those tools are installed.
- Manage deployed configuration with Vercel environment variables, not committed files.

## Verification and Definition of Done

For application changes, the current minimum gate is `bun run build`. Also exercise the changed route or workflow through `bun dev`. For documentation-only changes, run `git diff --check` and verify every command, path, and version against the repository.

A change is complete only when its requested behavior is implemented, relevant edge cases are checked, verification evidence is fresh, no secrets are present, and documentation or migrations are updated when interfaces changed. Report missing tooling or unverified behavior plainly.

## Git and Review Workflow

- Preserve unrelated working-tree changes and stage only files belonging to the task.
- Use Conventional Commits: `type(scope): concise summary`. Common types are `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, and `chore`.
- Review every AI-generated change before committing; the contributor must be able to explain it.
- Do not commit, push, deploy, or create a pull request unless the user requests that action.
- Before handoff, review the diff for accidental scope growth and state exactly what was and was not verified.

## Deployment

Vercel is the deployment platform. The documented production URL is `https://sdpx-ultrasmooth.vercel.app`, and the documented staging URL is `https://sdpx-ultrasmooth-s1ux.vercel.app/`. Run a production build before deployment, use Vercel-managed environment variables, and verify the target URL and critical flows after every release.
