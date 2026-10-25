# PRD gap audit — 2026-10-25

This is a source review of the current working tree, including uncommitted work.
It is not a certification of the deployed application. “Partial” means that a
type, domain function or unit test exists but the live application flow does not
meet the full acceptance criterion. Existing backlog PASS labels alone are not
evidence of an integrated feature.

## Correctness gaps to address first

| Requirement                  | Finding                                                                                                                                                                                                                                                                                             | Evidence                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| FR-SCORE-04, §9.4 (Resolved) | Implemented single task-weighted participation multiplier `M` applying to `(groupScore + individualScore) * M`.                                                                                                                                                                                     | `src/features/pairwise/domain/generated-results.ts`                                                     |
| FR-SCORE-08 (Resolved)       | `overrideScore` added to HTTP handlers, client endpoints, and OpenAPI. `generatedResult` applies overrides. Teacher dialog added.                                                                                                                                                                   | `src/features/assignments/server/http-handlers.ts`, `src/features/pairwise/domain/generated-results.ts` |
| FR-SCORE-09 (Resolved)       | Finalization snapshots computed score outputs in `finalizedSnapshot.outputs.scores` and serves frozen outputs.                                                                                                                                                                                      | `src/features/assignments/domain/assignment-policy.ts` (`finalizeAssignment`), `generated-results.ts`   |
| INV-4 (§8.4)                 | Persisted max-flow allocation limits maximum workload but does not enforce workload difference ≤ 1. A direct local probe with 4 groups × 4 students, 1 criterion, target coverage 5 produced per-person workloads ranging from 0 to 3. Pair coverage balance (FR-PAIR-06) is a different invariant. | `src/features/pairwise/domain/regeneration.ts` (`distribute`, `previewRegeneration`)                    |
| FR-AUTHZ-02                  | Unauthorized assignment/classroom reads return 403; PRD specifies 404 for cross-classroom resources.                                                                                                                                                                                                | AssignmentService.get, ClassroomService.get                                                             |

## Required functionality still missing or partial

| Requirement                                    | Remaining work                                                                                                                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-ASSIGN-01, FR-ASSIGN-05                     | Separate group/individual deadlines; actual classroom timezone in display; artifact data/input. The assignment aggregate currently has one deadline.                                                                                                    |
| FR-ASSIGN-02                                   | Separate criteria per side with editable weights and publish-time validation that each side totals 100%. Current flow shares question strings and derives equal weights.                                                                                |
| FR-EVAL-02                                     | Card supports artifact URLs and an empty state, but assignment/group artifact entry and data wiring are missing.                                                                                                                                        |
| FR-PAIR-10, FR-REPORT-03, FR-NOTIF-05 (Should) | Assign additional evaluators to a particular pair, teacher self-evaluation, and notification of additional assignments. Coverage UI currently shows assigned/submitted counts without pair mean or these actions. Regeneration is not the same feature. |
| FR-SCORE-03 (Resolved)                         | The scoring function passes evaluator roles and instructor weight in generated-results, reports panels, and export.                                                                                                                                     |
| FR-SCORE-06 (Resolved)                         | Daily 02:00 classroom-timezone recomputation helper (`isInterimRecomputationDue`), cron script, and explicit on-demand teacher recompute operation (`/recompute`).                                                                                      |
| FR-SCORE-07 (Resolved)                         | Standardized provisional warning label "ชั่วคราว — อาจเปลี่ยนแปลงได้" on any unfinalized score display.                                                                                                                                                 |
| FR-SCORE-12, FR-SCORE-13                       | Show participation policy at assignment opening and the student's live aggregate `p` and `M`. Answer progress alone does not satisfy this requirement.                                                                                                  |
| FR-REPORT-02                                   | Teacher individual summary lacks criterion-level q/count/flags and participation columns in the current UI. The workbook has more detail.                                                                                                               |
| FR-EXPORT-03 | Implemented locally: owner raw CSV export uses per-file pseudonymous evaluator/item IDs by default. Route, UI and service tests present; remote/browser verification pending. |
| FR-ANON-05, FR-AUDIT-01 | FR-EXPORT-04 is implemented locally: Owner-only identity export, explicit confirmation, fail-closed durable audit. General evaluator-identity reads outside this export still need complete auditing. |
| FR-EXPORT-05                                   | Filename builder exists, but the UI adapter uses literal `classroom` instead of the actual classroom slug. CSV-imported student IDs are also not passed through this adapter to the workbook.                                                           |
| FR-AUDIT-02                                    | Audit infrastructure has an IP field, but current mutation records do not consistently populate it; before/after records are incomplete for some actions.                                                                                               |
| FR-AUTH-02                                     | Classroom domain checks exist on join, but need enforcement across all identity/roster access paths, including imported members. Hosted OAuth domain restriction has not been verified.                                                                 |
| FR-AUTH-03                                     | Roster and hosted-auth normalization exists; local credentials and several membership lookups only lowercase addresses. Alias matching is not consistent across the full flow.                                                                          |
| FR-AUTH-04                                     | Local sessions currently last 7 days, not 12 hours; no local silent session refresh flow.                                                                                                                                                               |
| FR-CLASS-05 (Should)                           | Import preview shows new data and old→new group movement, but not a complete before/after diff for name/student-ID edits.                                                                                                                               |
| FR-CLASS-07 (Should)                           | Archive UI exists, but not every classroom mutation rejects archived classrooms (for example staff and assignment linking).                                                                                                                             |
| FR-API-02                                      | Submission API uses generation/revision checks, but does not accept/replay `Idempotency-Key`; a repeated request can receive 409 instead of its original result.                                                                                        |
| FR-API-04                                      | Authentication rate limiting exists; application-wide 120 requests/min/user and export 5/min with Retry-After are not implemented across the required paths.                                                                                            |
| FR-PRIV-01, FR-PRIV-02, FR-PRIV-03             | First-login privacy notice; retention-based anonymization; personal-data copy request flow.                                                                                                                                                             |
| FR-SEC-04                                      | CSV export protects formula-like strings. Import currently preserves them without the required import-side escaping.                                                                                                                                    |

## Should requirements with no complete feature

- FR-AUTHZ-03: one identity with different instructor/student roles in different classrooms; current user role is global.
- FR-ASSIGN-06: clone assignment/configuration.
- FR-EVAL-10: countdown below 48 hours.
- FR-EVAL-13: durable offline answer queue and automatic reconnect synchronization. Current hook retains unsaved answers in memory and offers retry.
- FR-REPORT-05: score distribution chart per criterion.
- FR-API-05: asynchronous export job and delivery link.
- FR-APPEAL-01 / FR-APPEAL-02: implemented on 2026-10-25. Assignment appeals tab supports student requests within seven days and owning-teacher uphold/override decisions. Verified locally with domain/service tests and PostgreSQL/browser E2E; remote deployment remains unverified (see lab-status).
- FR-A11Y-07: manual NVDA/VoiceOver verification has not been evidenced.

## Scope decisions and verification, not automatically new implementation work

- FR-AUTH-01 requires Google-only login with no local password. The user explicitly requested email/password registration and testing earlier. The current local-password flow is a deliberate scope difference; resolve the PRD/auth-provider decision rather than silently removing it.
- User-facing roles were deliberately reduced to teacher and student. Reconcile role-matrix expectations with this decision before expanding roles.
- FR-A11Y-03 / FR-A11Y-05 require a complete contrast/keyboard audit. Native radio keyboard support and labels have been verified locally, but do not prove the whole application meets those requirements.
- FR-SEC-01 / FR-SEC-06 / FR-SEC-07 require deployment/secret-management/remote-scanning evidence. Source review alone cannot establish deployed configuration. Production test routes are guarded; see existing security tests.
- QS-06 and QS-07 are named in the quality-signal type, but no implemented detectors were found. They are quality specifications rather than FR-numbered rows.
- Existing previously imported provisional classroom identities require a one-time CSV re-import before they are provisioned under the new stable-identity flow.

## Features no longer considered wholly missing

The current tree includes classroom CSV import/upsert and pending student identity
provisioning, draft classroom roster propagation, persisted first-publication pairs,
regeneration with history, six-point comparison controls, autosave, partial bulk
submission, resubmission revisions, group/individual tabs, summary CSV and four-sheet
XLSX export, and in-app opening/reminder/regeneration/finalization notifications.
The partial gaps above still apply to these larger feature areas.
