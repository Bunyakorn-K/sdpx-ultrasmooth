<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PairEval Engineering Guide

## Product Overview

PairEval is a university student-evaluation system based on pairwise comparison. A reviewer sees two submissions side by side, selects the stronger one, and the system turns repeated comparisons into a more consistent ranking.

The repository is currently an early landing-page scaffold. Authentication, comparison workflows, ranking logic, persistence, and reviewer dashboards are target capabilities, not implemented features. Do not describe them as working until verified in the live code.

## Sources of Truth

Use sources in this order when they disagree:

1. Live code, `package.json`, `bun.lock`, and executable verification.
2. This file for engineering policy and target architecture.
3. `memory-bank/standards/tech-stack.md` for approved product and stack decisions.
4. `README.md` for onboarding; it may lag behind the implementation.

Surface contradictions instead of silently choosing an interpretation. Keep current-state facts separate from planned architecture.

## Current Repository State

- Runtime: Next.js 16.2.10 and React 19.2.4.
- Language: TypeScript 5 in strict, no-emit mode.
- Router: Pages Router under `src/pages`; `src/pages/index.tsx` is the landing page.
- Styling: Tailwind CSS 4 through `src/styles/globals.css`.
- Tooling: Bun is the package manager; `bun.lock` is the canonical lockfile.
- Configuration: React Compiler and React Strict Mode are enabled.
- Imports: `#/*` maps to `src/*`.
- Available scripts: `dev`, `build`, and `start` only.
- No lint, automated test, database, authentication, or Git-hook tooling is installed yet.

## Target Architecture

- Use the Next.js App Router for new product work and TypeScript across client and server code.
- Use Tailwind CSS for styling.
- Use PostgreSQL hosted by Supabase for persistence.
- Use Drizzle ORM as the only application-level database access layer and for schema migrations.
- Use Better Auth for sessions and Google OAuth; do not create a parallel Supabase Auth session model.
- Use TanStack Query for interactive client-side server state and cache synchronization.
- Use Jotai for local or cross-component UI state, not remote data or authenticated sessions.
- Use Remeda for non-trivial, pure data transformations when native methods would be less clear.
- Deploy on Vercel. Treat recorded deployment endpoints as metadata that must be verified before use.

These libraries are approved targets but are not currently dependencies. Install a library only when the task needs it, use its current official integration guidance, and commit the resulting `package.json` and `bun.lock` changes together.

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

The target request flow is: UI → Server Component or TanStack Query → server boundary → domain logic → Drizzle → Supabase PostgreSQL.

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
bun run build                  # production build and type integration check
bun run start                  # serve a completed production build
```

Do not claim lint or tests passed while those scripts do not exist. When adding linting or tests, expose stable `bun run lint` and `bun test` commands in `package.json` and document their scope.

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
- Use least-privilege Supabase credentials and never expose service-role access to the browser.
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
