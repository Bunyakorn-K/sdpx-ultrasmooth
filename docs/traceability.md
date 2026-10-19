# Story Traceability

## Issue #7 — User Story 01

Source: [Bunyakorn-K/sdpx-ultrasmooth#7](https://github.com/Bunyakorn-K/sdpx-ultrasmooth/issues/7)

> As a student, I want to see a homepage so that it looks beautiful.

| Requirement | Implemented contract | Evidence |
| --- | --- | --- |
| Visitor entering the URL sees the homepage | `src/pages/index.tsx` renders the PairEval landing page at `/` | `tests/e2e/specs/smoke.spec.ts` opens `/` and asserts the visible hero heading and product label |
| Homepage communicates PairEval purpose | Hero heading and `University Evaluation System` label are rendered | `src/features/home/index.test.tsx` |
| Homepage provides basic navigation | PairEval brand, Create account, and Sign in entry points; unused section links are removed | `src/features/home/index.test.tsx`, `tests/e2e/specs/smoke.spec.ts` |

## Definition of Done mapping

- Feature acceptance: covered by the browser smoke test.
- Unit test: homepage content and navigation are covered by Vitest + React Testing Library.
- E2E test: covered locally for the current issue; the issue text's “WS-04” note is a course-workstream contradiction, not a reason to omit the test.
- Code review: pending human review.
- Staging deployment: existing staging URL returned HTTP 200 on 2026-08-11; this working-tree change was not deployed.


## Teacher/student scope (2026-10-19)

The current 11 story drafts and AC-to-code/test mapping are in "docs/backlog.md".
They have not been published as new GitHub Issues. See "docs/workshops/ws-01-08-status.md"
for course-artifact and external-verification gaps.
