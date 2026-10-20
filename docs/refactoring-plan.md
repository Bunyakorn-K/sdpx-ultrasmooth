# Refactoring Plan — Codebase Review

Reviewed 2026-10-20 against user requirements, existing tests and WS01–WS08. File names refer to the final feature structure; line numbers move during formatting.

## High Priority

1. `shared/server/http.ts`: malformed JSON/null/arrays previously reached generic server errors. Fixed with bounded object parsing, stable errors and regression tests.
2. `features/auth/server/http-handlers.ts`: login attempts were unbounded. Added persistent per-email-hash limits and a database-backed E2E case.
3. `shared/server/database.ts`: Neon HTTP-only adapter could not support plain Docker PostgreSQL. Added a TCP transport; a real test exposed double-encoded JSONB, fixed the serializer and verified actual persistence/concurrent submissions.
4. Test seed/cleanup: added strict production denial, explicit opt-in, isolated database-name check and constant-time token validation. No test-only endpoint appears in the public OpenAPI.
5. `package.json`: vulnerable ExcelJS transitive UUID dependency. Scoped override to compatible CommonJS UUID 11.1.1; import/export tests verify continued behavior. Production audit now has zero findings; unpatched development-only glob findings are documented separately.

## Medium Priority

1. Frontend URL handling: originally all screens were selected by root page state. User requested genuine App Router URLs; keep route files in `app/` and move implementation to feature screens/provider.
2. `features/assignments/server/assignment-service.ts`: retry loop mixed lookup selection with mutation/persistence. Extracted only the lookup choice under an unchanged test harness; see `refactoring-assignment-service.md`.
3. MUI/HTML/accessibility: keyboard-only navigation links, search naming, group Chip markup and narrow tabs needed attention. UI sub-agent handled targeted fixes while preserving theme and stable labels.
4. `features/assignments/services/excel-service.ts`: native Node dynamic imports did not expose Workbook as a named CommonJS export. Standardized on the default ExcelJS export and added real-workbook import tests.

## Deferred, Evidence Required

- Normalize all assignment data or add lightweight list projections only after measuring real payload sizes/contention on staging.
- Introduce caching only if traces identify a query bottleneck; the current local test does not establish one.
- Replace cookie sessions with Neon Auth only with explicit product decision/migration design.

## What AI Suggested vs What Was Done

| Suggestion                                             | Decision    | Reason                                                            |
| ------------------------------------------------------ | ----------- | ----------------------------------------------------------------- |
| Explicit feature boundaries / thin App Router files    | Implemented | User explicitly requested it                                      |
| Repository injection                                   | Retained    | Existing service tests need deterministic persistence behavior    |
| Extra command bus/framework                            | Not adopted | No concrete problem requiring another abstraction                 |
| Broad test rewrites during scoped service refactor     | Not adopted | Existing unit test hashes recorded unchanged                      |
| Force downgrade Next.js ESLint config to silence audit | Not adopted | Would mismatch Next.js 16; unpatched dev-only advisory is tracked |
| Large normalization/performance rewrite                | Deferred    | No staging evidence justifies it yet                              |

## Business Context Observations

- No classroom is intentional, not a missing feature.
- Every student may vote, so ballots are per person/other group, not one ballot per team.
- Question order is frozen once voting opens because scores correspond to question indices.
- A zero-score group with no ballots is different from a group that received low scores; the export includes evaluator counts for interpretation.
- These are observations of the supplied requirements and implementation, not invented feedback from a student team.
