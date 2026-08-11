# ADR 0001: Keep Issue #7 Homepage-Only

- Status: Accepted
- Date: 2026-08-11
- Scope: Issue #7 and WS-01 through WS-03 repository deliverables

## Decision

Implement and verify the current PairEval landing-page contract only. Keep the existing Pages Router homepage in place until a complete App Router route migration is separately designed and verified.

## Accepted

- Homepage rendering and metadata.
- Semantic navigation anchors and the visible `Sign in` entry point.
- Vitest unit coverage and a Playwright browser smoke test.
- Safe environment documentation and traceability artifacts.

## Rejected for this story

Authentication, persistence, comparison workflows, ranking logic, reviewer dashboards, LMS integration, and any API endpoint that does not exist in the live code.

## Rationale

Issue #7 asks a visitor to see the homepage. The repository rules identify the other capabilities as planned, not implemented. Adding them now would create unverified behavior and scope creep.
