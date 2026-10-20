# ADR-001: Feature Based Architecture with Explicit Boundaries

## Status

Accepted — the user explicitly requested feature based structure, SOLID/Clean code and MUI in this session. This records that confirmed direction, not a separate team vote.

## Date

2026-10-20

## Context

Peerly combines account sessions, teacher/student workflows, group voting and Excel files. Keeping every form and database operation in one page makes ownership rules and UI behavior difficult to test independently. The repository already uses Next.js App Router and the user requires MUI plus a shared design reference.

## Decision

Use `features/auth`, `features/assignments`, `features/landing`, `features/workspace` and small shared utilities. Keep Next.js `page.tsx`, `layout.tsx` and `route.ts` in `app/` as framework adapters. Features own screens, hooks, domain rules and services. Inject repository interfaces into application services. Preserve MUI and the existing Neon production requirement.

## Alternatives Considered

1. A single page/controller containing UI, SQL and validation — rejected because independent tests and ownership reasoning become harder.
2. Folder-by-technical-type for all components/services/repositories — not chosen because a single feature change would span unrelated global folders.
3. Microservices or a command-bus framework — not chosen; there is no measured deployment/scaling requirement justifying their operational cost.

## Consequences

### Positive

- Domain invariants run without React, Next.js cookies or a real database.
- Fakes implement the same repository interfaces as production.
- Frontend routing follows App Router conventions while feature implementation remains colocated.

### Negative / Trade-offs

- More files and small adapters than a one-page prototype.
- Workspace orchestration must remain a composition layer; features should not import its concrete controller types back.
- Shared state across routes requires a root provider and careful session restoration.

## Revisit When

A feature needs a separate deployment, cross-feature imports become cyclic, or measured maintenance/runtime costs justify a new boundary.

## AI-DLC Note

AI proposed separating responsibilities and thin framework adapters. Human direction in the conversation explicitly selected feature based structure, SOLID, MUI and genuine App Router routes. No student names or unobserved team approval are inferred.
