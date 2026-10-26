# PRD gap audit — 2026-10-25

This is a source review of the current working tree, including uncommitted work.
It is not a certification of the deployed application. “Partial” means that a
type, domain function or unit test exists but the live application flow does not
meet the full acceptance criterion. Existing backlog PASS labels alone are not
evidence of an integrated feature.

## Correctness gaps to address first

| Requirement                  | Finding                                                                                                                           | Evidence                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| FR-SCORE-04, §9.4 (Resolved) | Implemented single task-weighted participation multiplier `M` applying to `(groupScore + individualScore) * M`.                   | `src/features/pairwise/domain/generated-results.ts`                                                     |
| FR-SCORE-08 (Resolved)       | `overrideScore` added to HTTP handlers, client endpoints, and OpenAPI. `generatedResult` applies overrides. Teacher dialog added. | `src/features/assignments/server/http-handlers.ts`, `src/features/pairwise/domain/generated-results.ts` |
| FR-SCORE-09 (Resolved)       | Finalization snapshots computed score outputs in `finalizedSnapshot.outputs.scores` and serves frozen outputs.                    | `src/features/assignments/domain/assignment-policy.ts` (`finalizeAssignment`), `generated-results.ts`   |
| INV-4 (?8.4) (Resolved)      | Pairing allocation enforces balanced evaluator workload with capacities k_min / k_min+1.                                          | `src/features/pairwise/domain/regeneration.ts`                                                          |
| FR-AUTHZ-02 (Resolved)       | Unauthorized cross-classroom resource reads return 404 to avoid leaking existence per PRD §7.1.                                   | AssignmentService.get, ClassroomService.get                                                             |

## Required functionality still missing or partial

| FR-ASSIGN-01, FR-ASSIGN-05 (Resolved)                      | Artifact URL, separate deadlines in assignment model, classroom timezone display.                                                                                                             |
| FR-ASSIGN-02 (Resolved)                                    | 100% criteria weight sum validation before publish in previewRegeneration, with weight percentages displayed in CriteriaPanel.                                                                |
| FR-EVAL-02 (Resolved)                                      | Artifact URLs wired from Group/Assignment with standard fallback "อาจารย์ยังไม่ได้ระบุ".                                                                                                       |
| FR-PAIR-10, FR-NOTIF-05 (Resolved); FR-REPORT-03 (partial) | Additional evaluator assignment and notifications are implemented. Teacher self-evaluation and pair mean actions still require verification.                                                  |
| FR-SCORE-03 (Resolved)                                     | The scoring function passes evaluator roles and instructor weight in generated-results, reports panels, and export.                                                                           |
| FR-SCORE-06 (Resolved)                                     | Daily 02:00 classroom-timezone recomputation helper (`isInterimRecomputationDue`), cron script, and explicit on-demand teacher recompute operation (`/recompute`).                            |
| FR-SCORE-07 (Resolved)                                     | Standardized provisional warning label "ชั่วคราว — อาจเปลี่ยนแปลงได้" on any unfinalized score display.                                                                                       |
| FR-SCORE-12, FR-SCORE-13                                   | Show participation policy at assignment opening and the student's live aggregate `p` and `M`. Answer progress alone does not satisfy this requirement.                                        |
| FR-REPORT-02                                               | Teacher individual summary lacks criterion-level q/count/flags and participation columns in the current UI. The workbook has more detail.                                                     |
| FR-EXPORT-03                                               | Implemented locally: owner raw CSV export uses per-file pseudonymous evaluator/item IDs by default. Route, UI and service tests present; remote/browser verification pending.                 |
| FR-ANON-05, FR-AUDIT-01 (Resolved)                         | Audit logging covers all 7 required activities: publish, unpublish, pair regeneration, score override, finalize/reopen, export with identity, view evaluator identity, and role change.       |
| FR-EXPORT-05                                               | Filename builder exists, but the UI adapter uses literal `classroom` instead of the actual classroom slug. CSV-imported student IDs are also not passed through this adapter to the workbook. |
| FR-AUDIT-02 (Resolved)                                     | Audit records capture actor, action, resource, before/after, UTC timestamp, client IP, and enforce mandatory reasons for override, reopen, unpublish, and pair regeneration.                  |
| FR-AUTH-02 (Resolved)                                      | Enforced allowed_email_domains restriction during CSV roster import, join, and OAuth callback.                                                                                                |
| FR-AUTH-03 (Resolved)                                      | Email normalization removes dots and +tags across all domains so Somchai.A+x@uni.ac.th matches somchaia@uni.ac.th per PRD §7.1.                                                               |
| FR-AUTH-04 (Resolved)                                      | Sessions configured with 12-hour lifetime and silent refresh in session-service and OAuth callback.                                                                                           |
| FR-CLASS-05 (Should)                                       | Import preview shows new data and old→new group movement, but not a complete before/after diff for name/student-ID edits.                                                                     |
| FR-CLASS-07 (Should)                                       | Archive UI exists, but not every classroom mutation rejects archived classrooms (for example staff and assignment linking).                                                                   |
| FR-API-02                                                  | Submission API uses generation/revision checks, but does not accept/replay `Idempotency-Key`; a repeated request can receive 409 instead of its original result.                              |
| FR-API-04                                                  | Authentication rate limiting exists; application-wide 120 requests/min/user and export 5/min with Retry-After are not implemented across the required paths.                                  |
| FR-PRIV-01, FR-PRIV-02, FR-PRIV-03                         | First-login privacy notice; retention-based anonymization; personal-data copy request flow.                                                                                                   |
| FR-SEC-04                                                  | CSV export protects formula-like strings. Import currently preserves them without the required import-side escaping.                                                                          |

## Should requirements with no complete feature

- FR-AUTHZ-03: TA roster import is implemented; different instructor/student roles per classroom still require verification because the user role is global.
- FR-ASSIGN-06 (Resolved): Clone assignment creates a new draft with fresh future deadline, copied config/criteria and zeroed answers.
- FR-EVAL-10 (Resolved): countdown below 48 hours implemented via useDeadlineCountdown and urgent banner.
- FR-EVAL-13 (Resolved): durable offline answer queue via localStorage and automatic reconnect synchronization on browser online event.
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
