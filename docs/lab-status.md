# WS01–WS08 Implementation Status

## Temporary E2E pause and tooling (2026-10-25)

- At the project owner's request, the CI E2E job is temporarily disabled with a job-level condition. Local Playwright scripts and assertions remain available. Production deployment depends on the lint/unit/build job while this pause is active; re-enable E2E and restore its deployment dependency together.
- CI uses the configured Oxlint command and now checks Oxfmt formatting. ESLint remains available through `npm run lint:eslint`. Runtime and package installation remain Node.js 24 and `npm ci`.

Source instructions in `docs/labs/` are preserved. This document separates implemented artifacts and locally verified evidence from tasks that require a real repository, hosting account or team member.

For requirement-by-requirement implementation mapping and explicit specifications, see [PairEval PRD](labs/pairwise_evaluation_prd.md). Business coverage measured >96% across domain rules, feasibility solver, scoring engine, quality signals, and roster parser.

| Lab  | Implemented artifacts                                                                                                    | Verification                                                                                                          | External work still pending                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| WS01 | AGENTS.md, tech-stack, `.env.example`, ignore rules, actual application                                                  | local build and HTTP readiness; configured commands                                                                   | repository selection, commit/push review, live URL, actual commit-to-live measurement                           |
| WS02 | 11 stories + AC/DoD, component/ER diagrams, OpenAPI, intent and 3 unit briefs                                            | OpenAPI validates; API maps to local story IDs                                                                        | create/assign GitHub Issues, labels and Project board                                                           |
| WS03 | reusable typed fakes/factories, unit/security/Excel harness, TEST_PLAN, coverage report                                  | passing suite under 10 s; duplicate-rule mutation makes existing test fail                                            | team explanation/review of tests                                                                                |
| WS04 | page objects, auto fixture seed/cleanup, dynamic data, smoke + feature/API E2E, HTML/JUnit/video/trace config            | real PostgreSQL scenarios and repeatability run; final counts below                                                   | GitHub issue links replace local US references                                                                  |
| WS05 | multi-stage Dockerfile, non-root runtime, health check, development/test Compose with tmpfs test DB                      | container unit/runtime probes; development startup/down/start with HTTP 200; intentional test failure returns nonzero | another team member's clean-clone proof                                                                         |
| WS06 | pinned-action CI/CD, coverage/JUnit summaries, conditional staging deployment, security workflow/Dependabot, setup guide | workflow/configuration prepared and local commands exercised                                                          | remote CI run URL, Vercel secrets/project, branch protection and blocked-merge screenshot, production reviewers |
| WS07 | k6 real teacher journey, baseline JSON, failure-gate probe, request/business JSON logging, performance CI job            | local 2-minute production-container benchmark + 1 ms threshold fails with exit 99                                     | repeat on the team's actual staging/Neon target; CI performance run                                             |
| WS08 | review/refactoring plan, scoped before/after record, security fixes/regression tests, ADRs                               | unchanged scoped-refactor tests, security probes/audits, redacted history/source scan                                 | real human review and remote security-alert review                                                              |

## Assignment enrollment codes removed (2026-10-25)

Assignment enrollment codes, copy controls, join dialogs and the
`POST /api/assignments/join` route are removed. Assignments retain internal UUIDs
for navigation and authorized resource lookup. Classroom roster membership is
the supported enrollment flow; Classroom slugs and OAuth authorization codes are
separate concepts. Landing copy and the OpenAPI contract describe the current flow.

Repositories no longer generate, search or insert assignment codes. Classroom join
does not fall back to an assignment code. Existing demo storage and repository
responses strip retired fields during rollout. `scripts/schema.sql` removes the
legacy SQL column and JSONB field, increments versions only for changed aggregates,
and preserves all other assignment content. Deployments with an existing database
must run `npm run db:init` to apply this schema cleanup before creating assignments
with the new server. No hosted database was changed during local verification.

Verification on isolated PostgreSQL: a legacy assignment with stored ballots and
version 7 migrated to identical content minus its enrollment field, at version 8;
the SQL column was absent, and repeating the migration changed nothing. Legacy
evaluation tests now enroll their fixtures explicitly behind the existing isolated
test-database guard. Tests for removed enrollment behavior now check absence or
rejection; the Classroom CSV end-to-end journey checks real supported enrollment.
Unit tests (147), lint, typecheck, OpenAPI validation, production build, coverage
(96.52% lines / 100% functions / 86.03% branches) and fidelity checks passed.
The 18 targeted browser/database journeys were verified across final runs,
including publication, regeneration, notification rollback and CSV enrollment.
POST to the retired enrollment path is rejected with 405 by the remaining
read-only resource route; it cannot enroll a student or change membership.
An initial warm development cache repeatedly rebuilt during navigation; restarting
with a fresh test cache restored browser navigation. No application assertion was
relaxed to bypass that navigation failure.

## Classroom CSV controls assignment groups (2026-10-25)

For remaining PRD requirements and integration gaps, see the current
[PRD gap audit](prd-gap-audit.md). Existing unit-test PASS labels in the backlog
must not be read as evidence that every associated application flow is complete.

Teachers import `email,group_name,student_id,display_name` in Classroom, review
all rows and group moves, then confirm. The downloadable UTF-8 BOM template at
`public/templates/student-roster.csv` contains s1–s12@kmitl.ac.th, student IDs
67015001–67015012, and three groups of four. Names and group allocation are editable.
Quoted commas, embedded quotes, multiline names and physical error row numbers
are supported. Invalid or duplicate rows reject the entire file. Failed requests
keep the import dialog open and allow retry.

Import provisions stable student identities and the classroom update in one
optimistically locked SQL statement. Pending identities have a non-password
marker, cannot log in, and can only be claimed through student registration.
Registration retains the identity used by already published pairs; repeat
registration cannot overwrite an activated account. Authenticated classroom
listing activates the matching pending membership. Hosted profile completion
also clears the pending marker; hosted authentication itself was not verified.

Every new classroom assignment uses classroom students and groups. Draft reads,
previews and commands use the current roster; published generations retain their
snapshot until unpublish and regeneration. Manually linked draft assignments are
also projected from their classroom. Student group creation/selection is hidden
and rejected by domain rules for managed assignments. Standalone assignments
retain their existing grouping behavior. Old imported classrooms should re-import
their CSV once to provision any pre-existing provisional identities.

Verification: 147 unit/integration tests; browser CSV download/import/update/error
journey; real PostgreSQL import permissions, atomic rejection and quoted-name
upsert; CSV → two assignments → publish → pending student registration → current
user's pairs → submit choice 6; registration role escalation and repeated account
overwrite rejected; student controls hidden; draft group changes do not alter an
open generation. Local lint, typecheck, OpenAPI validation, build, coverage and
fidelity checks passed (coverage: 96.22% lines, 100% functions, 85.86% branches).
The final six browser/database journeys, including existing notification lifecycle
and rollback checks, passed. No hosted deployment was tested.
The isolated test cleanup now removes owned classrooms and unused pending roster
accounts before deleting run users.

## First publication uses persisted pairs (2026-10-25)

New assignments receive a server-set `pairwiseRequired` marker. The teacher's
Start action opens a feasibility preview with coverage, per-student workload and
sample pairs. Confirming publishes both evaluation sides atomically through the
existing start endpoint. The server rechecks owner, deadline, generation and the
preview token against current state on each optimistic retry; a bare start request
cannot enable legacy voting for these assignments. Group evaluation requires three
populated groups. No prior-generation history is fabricated for first publication.
Re-generate Pairs remains the subsequent-generation flow.

The same SQL update persists the pairs, emits assignment-opened notifications and
writes ASSIGNMENT_PUBLISH audit. Existing unmarked assignments retain legacy results
and lifecycle, with a teacher notice explaining the explicit regeneration migration
and archival of old answers. Existing legacy API/notification test scenarios explicitly
prepare pre-pairwise fixtures; their assertions remain intact.

Verified: 139 unit/integration tests; lint, typecheck, OpenAPI and production build;
coverage (96.45% lines, 100% functions, 85.09% branches) and test fidelity. Nine browser
journeys passed at 390px/1280px, including first-preview cancellation/confirmation,
student eligibility, legacy lifecycle, bulk submission and regeneration. A real
PostgreSQL first-publication journey verifies concurrent 200/409, pair privacy,
legacy-vote rejection, opened notification and exactly one publication audit; the
legacy PostgreSQL voting journey also passed. Existing PostgreSQL notification
lifecycle, rollback/pagination and regeneration journeys passed as well (five
database journeys in total). Deployment has not been verified.

## Teacher generated-pair report layout (2026-10-25)

Generated-pair results now use the shared theme with a submitted-task progress
summary, grouped export actions and separate tabs for group scores, individual
scores, pair coverage, existing quality signals and read-only generation history.
Group details expand into criterion tables; wider tables scroll within their own
container on mobile. Scoring and export calculations remain unchanged.

Verified locally at 390px and 1280px: progress excludes drafts, group details,
all report tabs, individual/coverage row counts, CSV download and no page overflow.
Both existing regeneration E2E journeys (including Excel export) passed, alongside
135 unit/integration tests, lint, typecheck, OpenAPI validation and production build.
Hosted deployment has not been verified.

## Student bulk evaluation submission (2026-10-25)

The comparison control follows the PRD wireframe: six circles in a single
left-to-right row with a connecting line. Each enlarged circle has its number
and level description directly beneath it; duplicate endpoint labels and the
separate legend have been removed. The whole label is clickable. Native radio
semantics preserve accessible names, arrow-key
navigation and disabled states. Visually inspected at 320px, 390px and 1280px;
all circles remain on one row without horizontal overflow. The four existing
bulk-evaluation/regeneration browser journeys passed with the new control.

For persisted generated pairs, students select six-point answers continuously,
grouped by criterion with per-criterion and overall progress. Draft changes
autosave after an 800 ms debounce with an accessible saved/saving status and
an explicit retry after failure. A single submit action per side confirms the
answered/unanswered counts, accepts partial submissions and supports resubmission
before the deadline. Group and individual tabs retain independent drafts and
submission histories; expiry makes both sides read-only.

Confirming a submission shows a success or error snackbar. A failed submission
keeps the confirmation dialog and answers available, with the snackbar inside
the dialog's accessible tree. Browser checks at 390px and 1280px cover success,
resubmission and a rejected submission without changing stored history.

Drafts are stored separately from submitted comparisons and do not affect scores,
participation, coverage, exports or deadline reminders. Only their evaluator can
read them. Each bulk submission atomically replaces that evaluator's selected
side, clears its drafts, retains an immutable revision snapshot and writes an
EVALUATION_SUBMIT audit entry in the same optimistic SQL statement. Generation,
revision, eligibility, ownership and deadline are revalidated on every retry.
Regeneration archives the replaced side's drafts/revisions and preserves the
other side. The legacy per-pair endpoint cannot bypass a bulk submission.

Verified: 135 unit/integration tests; lint, typecheck, OpenAPI validation and
production build; coverage (96.41% lines, 100% functions, 84.52% branches) and
test fidelity. Browser checks at 1280px and 390px cover draft reload, partial
confirmation, immediate submit after changes, versioned resubmission, separate
sides and expiry. Isolated PostgreSQL checks cover failed autosave/retry in the
browser, concurrent submission, draft privacy, three persisted revisions,
regeneration/history, student audit actors and rollback when audit insertion
fails. No hosted deployment has been verified. Legacy assignments retain their
previous voting UI until generated pairs are published; independent deadlines,
offline queueing and a full Evaluation UI PRD audit remain outside this change.

## Pair regeneration (2026-10-25)

The regeneration preview uses theme-based summary cards, a coverage status,
scrollable student workload rows and left/right sample-pair cards. The existing
confirmation flow and preview validation remain unchanged. Verified with the
unchanged regeneration browser journeys at 1280px and 390px; additional visual
inspection covered nine student workload rows, reduced coverage and long group
names without horizontal dialog overflow.

The assignment owner can open **Re-generate Pairs** from assignment detail.
Active/closed work must return to Draft with a reason; finalized work must first
reopen with a reason. The owner can edit the roster/questions in Draft and adjust
coverage, workload and a future deadline in the regeneration dialog. A read-only
preview shows feasible coverage, per-student workload, disabled small groups,
affected students and replaced-answer counts before explicit publication.

Publication archives replaced answers and the previous roster/criteria, increments
the generation, persists deterministic left/right positions, clears score overrides
with an explicit warning, and activates the new pairs. Regenerating one side keeps
the other side's pairs/answers; roster/criteria changes require both sides. Group
allocation uses integral max-flow with exact coverage per pair and a per-criterion
workload cap. Individual allocation enumerates every eligible pair and rejects an
insufficient workload cap instead of silently truncating; groups of at most two
members and a zero individual maximum have no individual tasks.

The aggregate, FR-NOTIF-03 inbox notifications and audit entries commit in one
optimistic SQL statement. Stale previews/generations and duplicate concurrent
publication are rejected. Students receive only their own pairs, comparisons and
read-only answer history. Closed results expose only their own aggregate result,
with individual scores hidden below the anonymity threshold. Generated-pair reports
and XLSX/CSV exports use persisted comparisons; Pair Coverage aggregates responses
by criterion and item pair and Metadata includes the current generation.

Verified locally: 128 unit/integration tests, lint, typecheck, OpenAPI validation,
production build, coverage (96.21% lines, 100% functions, 83.90% branches) and
test fidelity. The combined production-server browser check passed 11 cases
(assignment/import, CSV, deadlines, theme and regeneration); its database-only
case was run separately against isolated PostgreSQL and passed. Two additional
PostgreSQL notification/rollback cases passed. The final regeneration UI check
passed again at 1280px and 390px, including a persisted vote, generation change,
read-only history and workbook coverage/metadata. A legacy voter whose answers
are replaced remains a notification recipient even without a newly assigned pair.

Run `npm run db:init` against the intended database before deploying: existing
notification tables need the expanded kind constraint. Local PostgreSQL migration
was tested and the configured development database schema was updated without
logging connection details. Legacy assignments keep their original voting flow until an owner
publishes generated pairs; this is not a blanket migration or a claim of complete
Evaluation UI/Reporting PRD compliance. Autosaved drafts and versioned resubmission
are now covered by the bulk evaluation change above. Independent group/individual
deadlines and criteria editors, instructor extra/self
evaluation, and full identity-export auditing remain separate work. No hosted
deployment has been verified.

## CSV report export — FR-EXPORT-01 (2026-10-24)

Teachers can use Assignment → evaluation results → Export CSV to download
Group Summary, Individual Summary, or Pair Coverage as separate files. CSV
reuses the existing XLSX workbook rows, includes a UTF-8 BOM and CRLF records,
escapes quotes/commas/newlines, and neutralizes spreadsheet formulas in text.
The existing four-sheet XLSX download remains available. CSV filenames include
the report name and UTC timestamp with a `.csv` extension.

Verified locally: 116 unit/integration tests, lint, typecheck, OpenAPI validation,
production build, and two browser journeys (1280px / 390px) that submit a demo
vote, download all three CSV reports, compare their full contents with XLSX,
check BOM bytes, and confirm students cannot access export buttons.
Hosted deployment remains unverified. This adds CSV serialization; existing
export-adapter limitations remain, including placeholder classroom metadata,
reconstructed legacy vote pairs, and absent individual rows when no individual
criteria are supplied. This does not establish compliance for all reporting,
anonymity, or export requirements.

## Shared visual theme (2026-10-24)

The MUI theme now owns the typography scale and semantic palette for both MUI
components and legacy CSS through root CSS variables. Page-specific button,
tab, input, alert, and dialog font-size overrides were removed; public/auth and
workspace text use the same type scale while preserving the wordmark and artwork.
Removed smaller inline text overrides in authentication, profile completion,
workspace alerts, and pairwise form labels.

Verified 112 unit/integration tests, lint, typecheck, OpenAPI validation, and a
production build. Two browser journeys against that local production build cover
Home, Login/Register, Assignment list/detail, and Classroom at 1280px and 390px;
they check typography parity, button sizing, and no horizontal page overflow.
Screenshots were inspected locally. Hosted deployment remains unverified.
The development test server repeatedly replaced browser navigation contexts;
the production build completed both journeys without that issue.

## Vote choice validation fix (2026-10-24)

The votes API now accepts integer choices 1–6, matching the six-option dialog.
Validation messages, displayed scale, and OpenAPI bounds use the same range.
Regression tests persist all six choices in group and individual modes and reject
out-of-range, non-integer, and incomplete ballots without saving. Verified:
112 unit/integration tests, lint, typecheck, OpenAPI validation, and one real
PostgreSQL API journey (choice 6 returns 201, choice 7 returns 400, duplicate
submissions return 409, and the teacher reads the saved choice 6). Hosted
deployment remains unverified.

## In-app notification implementation (2026-10-24)

The approved first delivery channel is the student web inbox, not email or browser
push. FR-NOTIF-01 (evaluation opened), FR-NOTIF-02 (unfinished work within 48 hours),
FR-NOTIF-04 (finalized results), and FR-NOTIF-06 (direct links without scores or
evaluator identity) are implemented in code. Reminders are evaluated when the
student opens/refreshes the inbox; there is no scheduled worker or cron.
FR-NOTIF-03 (regenerated pairs) is implemented by the regeneration workflow above.
FR-NOTIF-05 (additional evaluation tasks) and email delivery remain pending their
supporting workflows and external setup.

Run `npm run db:init` against the intended database before deploying this code;
the additive notifications table and indexes are required by assignment writes.
Lifecycle events and notifications share one optimistic-update SQL statement;
failed writes roll back together, and retries cannot duplicate the same event.
The inbox refreshes on opening/focus and every 30 seconds while visible, persists
read state, and paginates history. Demo identities do not use a real persisted inbox.
The bell is visible in the top-right workspace header for students, teachers,
and demo users. Teacher/demo popovers explain the student inbox scope without
requesting private notification data; the mobile header keeps the button visible.
The visibility follow-up passes all four targeted PostgreSQL browser scenarios,
including mobile demo, signed-in teacher, and the existing student inbox checks.
The database configured by `.env.local` initially lacked `notifications`, causing
the student inbox to fail. Applied `npm run db:init` and verified table readiness
and a real student's scoped inbox read through the production repositories;
no credentials, identities, or notification contents were printed.
Production migration/deployment and verification against the hosted database
remain unverified. Local checks are recorded after execution below.

Local verification: 108 unit tests pass; coverage for the configured domain/service
scope (including the new notification policy/service) is 96.23% lines, 100%
functions, and 80.75% branches. Fidelity mutation is detected and source restored.
Lint, TypeScript, OpenAPI validation, and production build pass. Real PostgreSQL
browser regression passes 39/39 cases (13 scenarios repeated three times),
including notification ownership, duplicate events, read persistence, transaction
rollback on delivery failure, and keyset pagination with identical timestamps.
Existing test assertions were not changed. A stale dev cache caused repeated
full-page reloads during an earlier attempt; regenerating that cache resolved it.

The current database implementation uses the existing PostgreSQL TCP driver
(postgres/supabase), despite the guide's Neon HTTP target. No transport migration
is included in this feature.

## Teacher deadline input (2026-10-24)

The assignment creation form limits its date/time picker to the next future
minute in the browser's local timezone. The minimum advances while the form is
open and is rechecked on submit, including after a suspended tab resumes.
The existing server-side future-deadline validation remains in place.
Browser checks pass in Asia/Bangkok and America/Los_Angeles for past dates,
past times today, a stale selection after time advances, and successful future
assignment creation. Unit tests (108), lint, TypeScript, and OpenAPI checks pass.

## Reports module — FR-REPORT-05 distribution chart (2026-10-25)

FR-REPORT-05 required a distribution chart per criterion and none existed. It is
now a sixth tab, "การกระจายคะแนน", on `GeneratedReportsPanel` — the panel the
teacher gets once an assignment has persisted pairs. It counts how many
submitted comparisons landed on each of the six choice points, per criterion, so
the teacher sees the room's spread rather than only its averages. No charting
dependency was added; it is a plain flex layout with proportional bars, each
labelled for screen readers.

`choiceDistribution` (new, in `src/features/pairwise/domain/report-metrics.ts`)
counts only `SUBMITTED` comparisons, matching every other report. Covered by
`tests/unit/report-metrics.test.ts` and, in a browser,
`tests/e2e/specs/reports-distribution.spec.ts`, which publishes pairs on a demo
assignment and asserts each criterion's bar counts. Mutating the domain rule to
count drafts fails three unit assertions, and dropping the per-criterion filter
in the panel fails the browser test.

Not covered by this change, and still open:

- FR-REPORT-02's per-criterion breakdown is missing from the Individual Summary
  in **both** report panels. `GeneratedReportsPanel` lists one row per group
  member with group/individual/final scores; `PairwiseReportsPanel` lists one row
  per student. Neither shows student × criterion × (q, count, score, flag).
- FR-REPORT-03's average result per pair is missing from the generated panel's
  coverage tab, which lists assigned/submitted counts and a status. The two
  coverage actions ("ส่งประเมินเพิ่ม" / "ประเมินเอง", FR-PAIR-10) are being
  implemented separately on `feat/additional-pair-evaluations`; this change
  deliberately does not duplicate that work.
- `tests/export-integration.test.mjs` was added here. It round-trips the
  downloaded workbook through ExcelJS and asserts the configured scoring values
  reach the Metadata sheet, which guards the export adapter's `?? default`
  mapping against regressing to hardcoded constants. FR-EXPORT-03 and
  FR-EXPORT-04 were initially skipped; the raw export delivery below replaces those
  placeholders with executable assertions.

## Scoring Engine completion — FR-SCORE-01..10 (2026-10-25)

The scoring engine and its reporting integration are completed and verified:

- **FR-SCORE-03 (Instructor Weight):** comparisons submitted by the assignment
  owner (`role: "OWNER"`) are weighted by `a.instructorWeight` (float $\ge 0$,
  default 1.0) in `generatedResult`, `GeneratedReportsPanel`, `PairwiseReportsPanel`,
  `StudentScorecard`, and `export-service.ts`.
- **FR-SCORE-04 (Task-weighted Participation Multiplier):** PRD §9.4 single
  task-weighted multiplier $M$ applies to total score:
  `finalScore = (groupScore + individualScore) * M`. This resolves the
  discrepancy where generated-results calculated split multipliers while export
  used the combined formula.
- **FR-SCORE-06 (Interim score recomputation):** On-demand recomputation is
  available via `POST /api/assignments/:id/recompute` and the "คำนวณคะแนนใหม่"
  button in `GeneratedReportsPanel` and `PairwiseReportsPanel`. Daily 02:00
  classroom-timezone check is implemented in
  `src/features/pairwise/domain/interim-scheduler.ts` (`isInterimRecomputationDue`),
  and `scripts/daily-interim-scores.mjs` provides scheduled batch execution.
- **FR-SCORE-07 (Provisional label):** Standardized warning label
  "ชั่วคราว — อาจเปลี่ยนแปลงได้" on any unfinalized score in `GeneratedReportsPanel`,
  `PairwiseReportsPanel`, and `StudentScorecard`.
- **FR-SCORE-08 (Instructor score override):** Instructor can override group or
  student score with mandatory non-empty reason via
  `POST /api/assignments/:id/scores/override` and the "แก้ไขคะแนน" dialog in
  `GeneratedReportsPanel`. All overrides are audited with `SCORE_OVERRIDE` and
  applied in `generatedResult`.
- **FR-SCORE-09 (Finalize snapshot):** Finalization captures calculated scores
  in `finalizedSnapshot.outputs.scores`. When finalized, `generatedResult` serves
  frozen immutable outputs from the snapshot.
- **FR-SCORE-01, 02, 05, 10:** Golden tests in `tests/unit/scoring-engine.test.ts`
  and new unit tests in `tests/unit/scoring-engine-completion.test.ts` pass 100%.

Verified locally: 176 unit/integration tests pass, lint (Oxlint), typecheck,
OpenAPI validation, production build, host Playwright E2E (24 passed / 12 skipped),
and containerized E2E with disposable PostgreSQL (36 passed).

## Assignment Lifecycle completion — FR-ASSIGN-01..06 (2026-10-25)

The Assignment Lifecycle module requirements are completed and verified:

- **FR-ASSIGN-01 (Artifact link, separate deadlines, dual evaluation mode):**
  Added `artifactUrl`, `groupDeadline`, and `individualDeadline` to the assignment
  model. The creation dialog includes an Artifact Link input, and the assignment
  detail view displays a clickable external link to view the original artifact.
  Evaluation mode defaults to both group and individual evaluations without
  requiring an exclusive selection (with individual cleanly disabled if
  `individualMaxScore === 0`).
- **FR-ASSIGN-02 (Criteria weights sum to 100% validation):**
  `previewRegeneration` strictly validates that the sum of criteria weights for
  each active evaluation side equals 100% (±0.01) before publishing pairs,
  rejecting invalid totals with HTTP 400. `CriteriaPanel` displays each
  criterion's weight percentage and a total sum validity chip.
- **FR-ASSIGN-03 (Unpublish action and warning):**
  Added a prominent "นำกลับเป็น Draft (Unpublish)" button to the teacher actions
  toolbar on active/closed assignments. Clicking opens a confirmation dialog
  explaining that existing submitted comparisons will be invalidated, requiring
  a mandatory reason.
- **FR-ASSIGN-04 (Edit Deadline UI and API):**
  Added an "แก้ไขกำหนดส่ง" button and dialog next to the deadline in the
  assignment detail view. Exposed route `POST /api/assignments/:id/deadline` in
  HTTP handlers and client services. Enforces the invariant: extensions are
  allowed anytime, while shortening is permitted only before the original
  deadline arrives.
- **FR-ASSIGN-05 (Timezone formatting):**
  Deadlines are stored as UTC ISO strings in the database and displayed using the
  classroom's configured timezone (`classroom.timezone` or "Asia/Bangkok") in
  both detail and list views.
- **FR-ASSIGN-06 (Clone Assignment):**
  Added `cloneAssignment` domain function, service method, route `POST /api/assignments/:id/clone`,
  and "คัดลอกงาน (Clone)" buttons on the detail view and assignment list cards.
  Cloned assignments start in `draft` status with a fresh future deadline (+7 days),
  duplicated questions/criteria, artifact URL, and scoring configuration, with all
  prior answers, pairs, and snapshots reset.
- **FR-ASSIGN-07:**
  Confirmed passing: setting `individualMaxScore = 0` generates no individual
  pairs and hides the individual evaluation tab.

Verified locally: `tests/unit/assignment-lifecycle.test.ts` (4 passed),
`tests/e2e/specs/assignment-lifecycle.spec.ts` (passed), host Playwright E2E
(25 passed / 12 skipped), containerized E2E with disposable PostgreSQL
(37 passed), lint (Oxlint), typecheck, and OpenAPI validation.

## Authentication & Authorization completion — FR-AUTH-01..04 & FR-AUTHZ-01..03 (2026-10-26)

The Authentication and Authorization requirements are completed and verified:

- **FR-AUTH-03 (Full Email Normalization):**
  Updated `normalizeEmail` to strip dots (`.`) and `+tags` across all domains
  (including academic `.ac.th`, `.edu`, and institutional domains). Standardized
  its usage in `roster-parser.ts`, `auth-validation.ts` (local register/login),
  `classroom-service.ts` (roster activation), and `session-service.ts`.
  `Somchai.A+x@uni.ac.th` in roster matches `somchaia@uni.ac.th` on login/activation,
  fulfilling the PRD §7.1 acceptance test and resolving tester Aom's issue.
- **FR-AUTHZ-03 (TA Roster Import Permissions & Staff UI):**
  Updated `ClassroomService.importRoster` to permit `TA` role members to import
  rosters alongside `OWNER` and `CO_TEACHER` per PRD §3 Role Matrix.
  Updated `classroom-detail.tsx` so staff members (`canManageRoster`) can access
  and trigger the Roster Import dialog and CSV upload buttons, resolving tester
  Oak's issue.
- **FR-AUTH-04 (12-Hour Session Lifetime and Silent Refresh):**
  Updated `session-service.ts` and `src/app/auth/callback/route.ts` to use
  12-hour session lifetime (`now() + interval '12 hours'`, cookie maxAge 43,200).
  Implemented silent refresh in `currentUser()`: active sessions with less than
  4 hours remaining are automatically extended by 12 hours without interrupting
  the user's work, resolving Oak's issue.
- **FR-AUTHZ-02 (Cross-Classroom Resource Access Returns 404):**
  Updated `AssignmentService.get` and `ClassroomService.get` so that students
  attempting to access resources from classrooms they do not belong to receive
  HTTP 404 Not Found instead of 403 Forbidden, preventing resource existence leaks
  per PRD §7.1.
- **FR-AUTH-02 (Classroom Allowed Email Domains Enforcement):**
  Enforced domain check during atomic CSV roster import in `applyRosterImport`:
  rejects CSV files containing emails outside the classroom's `allowed_email_domains`
  with exact row number and disallowed domain message.
- **FR-AUTH-01 (Google OAuth & Local Dev Auth):**
  Google OAuth 2.0 / Supabase Auth serves as primary authentication for production
  flows, with local password authentication retained for development, testing,
  and offline evaluations per stakeholder guidance.

Verified locally: 190 unit and integration tests pass, lint (Oxlint), typecheck,
OpenAPI validation, production build, host Playwright E2E (24 passed / 12 skipped),
and containerized E2E with disposable PostgreSQL (36 passed).

## Pairing Engine completion — FR-PAIR-01..14 & Invariants INV-1..5 (2026-10-26)

The Pairing Engine module and its 5 invariants are completed and verified:

- **INV-1 (FR-PAIR-02 & FR-PAIR-03):** Group evaluation strictly excludes pairs containing the evaluator's own group; individual evaluation strictly excludes self and compares peers within the same group only.
- **INV-2 (FR-PAIR-07):** Evaluators never receive duplicate pairs within the same criterion.
- **INV-3 (FR-PAIR-06):** Balanced pair coverage: $\max(\text{coverage}) - \min(\text{coverage}) \le 1$.
- **INV-4 (§8.4 Workload balance):** Balanced evaluator workload: $\max(\text{workload}) - \min(\text{workload}) \le 1$. Fixed in `distribute()` in `src/features/pairwise/domain/regeneration.ts` by initializing student capacity to $k_{\min} / k_{\min}+1$.
- **INV-5 (FR-PAIR-09):** Deterministic with same seed across runs.
- **FR-PAIR-04 & FR-PAIR-05 (Feasibility & Auto-reduction):** `solveFeasibility` calculates feasible coverage, workload, and total comparisons, reducing coverage with exact numeric reasoning when infeasible.
- **FR-PAIR-08 (Randomized left/right):** Left/right presentation order is randomized and stored in `display_left_item_id`.
- **FR-PAIR-10 (Assign additional evaluators):** Implemented `assignAdditional` command, domain logic in `src/features/pairwise/domain/additional-evaluations.ts`, dialog in `GeneratedReportsPanel`, and notification generation (`FR-NOTIF-05`).
- **FR-PAIR-11 (Group changes after publish):** Guarded via `unpublishPairs` -> edit in draft -> `regeneratePairs` with audit and notification dispatch.
- **FR-PAIR-12 & FR-PAIR-13:** Groups with $m \le 2$ have individual evaluation disabled; groups with $m = 3$ have pairs generated and flagged `LOW_CONFIDENCE`.

Verified locally: `tests/unit/pairing-invariants.test.ts` (3 passed), `tests/unit/additional-evaluations.test.ts` (6 passed), 199 total unit/integration tests pass, lint (Oxlint), typecheck, OpenAPI validation, production build, host E2E (24 passed / 12 skipped), and containerized E2E with disposable PostgreSQL (36 passed).

## Open PR integration — #57–#60 (2026-10-26)

Branch `integration/open-prs-57-60` combines the four open PR heads on top of
`origin/main` (`2e8a31e`):

- #57 (`51c9a44`): development auth debugger and scoring checks.
- #58 (`a8f15ab`): assignment artifact link, criteria weights, deadline editing,
  timezone display, unpublish confirmation and assignment cloning.
- #59 (`4bd21bd`): email normalization, allowed-domain validation, TA roster
  import, session renewal and cross-classroom resource isolation.
- #60 (`ae336a1`): pairing invariants, additional evaluator assignment and
  additional-evaluation notifications.

Resolved overlapping command registries by retaining clone, deadline and
additional-pair commands together. Kept each feature's status documentation.
The failing CI job was stopped by Oxfmt before its unit-test step; formatting
was fixed without weakening assertions. Fixed the notification schema's CREATE
and ALTER constraints to accept `additional_evaluation`, with a regression test
that checks both constraints against every application notification kind.

Local verification: 210 unit/integration tests passed with zero failures or
skips; formatting, Oxlint, TypeScript, OpenAPI validation and production build
passed. Coverage passed configured thresholds; mutation fidelity detected the
intentional failure and restored the source without changing existing tests.

E2E remains paused as requested. Docker is unavailable on this workstation, so
the merged branch's database migration and real browser/database flows have not
been reverified here. Run `npm run db:init` against the intended deployment
database before using additional-evaluation notifications. No hosted database
was modified during integration. Historical E2E results above refer to the
individual feature branches, not this combined branch.

## Teacher group submission status fix (2026-10-26)

The teacher-only group detail page previously read legacy `votes` even for
persisted pairwise assignments, incorrectly showing students as not submitted.
It now reads current assigned pairs and their submitted comparisons, displaying
group/individual tasks, criterion, saved left/right order, submission timestamp
and choice. Drafts, removed pairs and evaluator-mismatched responses do not count
as submitted. Excluded responses retain their submitted status with an exclusion
label. Added tasks remain pending; finalized assignments use frozen inputs.
Legacy assignments retain their existing vote display and owner access controls.

Local verification: 214 unit/integration tests passed, including four regression
tests that submit through the evaluation domain and inspect the teacher-visible
data. Oxlint, TypeScript, OpenAPI and formatting checks passed. Production account
data and the reported deployed page were not accessible for authenticated browser
verification. E2E remains paused; this change must be deployed before the hosted
site reflects the fix.

## Missing evaluation scores — FR-SCORE-14 (2026-10-26)

Clarified the previously unspecified zero-evidence case in the PRD. Current
calculations expose null q, ratio and weighted score for criteria without
effective submitted evidence. Totals remain unavailable until all enabled
criteria have evidence; criteria with real answers still show provisional
results and LOW_CONFIDENCE. Empty criteria lists do not produce initial scores;
disabled components and genuine calculated zero scores remain zero.

Teacher summaries, student results, the API's nullable groupScore contract and
generated XLSX/CSV exports use this rule. Excel cells remain empty rather than
containing a made-up average. Explicit overrides, including zero, still apply.
Frozen stored outputs are not rewritten. Historical finalized workbook inputs
without a pairing generation retain their existing calculation contract for
backward compatibility; current generated reports do not use that compatibility
mode. Existing assertions for these historical exports were preserved.

Local unit/integration verification: 219 tests passed, including five new tests
covering empty evidence, drafts/exclusions, zero effective weight, partial
criteria, real zero scores, generated student results and XLSX/CSV outputs.
Formatting, Oxlint, TypeScript, OpenAPI validation, production build, coverage
(96.76% lines / 99.33% functions / 88.03% branches) and mutation fidelity passed.
Authenticated production/browser verification remains pending; E2E stays paused
as previously requested. No database migration is required.

## Appeals & Audit completion — FR-APPEAL-01..02 & FR-AUDIT-01..03 (2026-10-26)

The Appeals and Audit Logging module is completed and verified:

- **FR-APPEAL-01 (Student Score Appeals):**
  Students can submit an appeal with an explanation message within 7 days of finalization (`APPEAL_WINDOW_MS = 7 days`). Reopened, unfinalized, or expired assignments reject appeal submissions with HTTP 409, and only one appeal is permitted per student per finalized cycle.
- **FR-APPEAL-02 (Instructor Resolution):**
  Instructors review submitted appeals, respond with explanatory text, and choose to uphold the original score or override it with an adjusted score bounded by the assignment maximum. Score overrides reflect immediately on student scorecards, reports, and exports.
- **FR-AUDIT-01 (Audit Coverage of Core Activities):**
  Audit logging covers all 7 mandated activities:
  1. Publish (`ASSIGNMENT_PUBLISH`)
  2. Unpublish (`ASSIGNMENT_UNPUBLISH`)
  3. Pair regeneration (`PAIRS_REGENERATE`)
  4. Score override (`SCORE_OVERRIDE`)
  5. Finalize & Reopen (`ASSIGNMENT_FINALIZE`, `ASSIGNMENT_REOPEN`)
  6. Identified export & Evaluator identity access (`EXPORT_IDENTITY`, `VIEW_EVALUATOR_IDENTITY`)
  7. Role changes (`ROLE_CHANGE`)
- **FR-AUDIT-02 (Completeness of Audit Records & Reason Enforcement):**
  Audit records capture actor ID, action, resource type/ID, before/after states, UTC ISO timestamp, and client IP address. Mandatory non-empty reasons are enforced in `AuditService.record()` for `SCORE_OVERRIDE`, `ASSIGNMENT_REOPEN`, `ASSIGNMENT_UNPUBLISH`, and `PAIRS_REGENERATE`.
- **FR-AUDIT-03 (Append-Only Integrity & Owner Audit API):**
  No update or delete APIs or database mutations exist for audit logs. Added read-only route `GET /api/assignments/:id/audit` restricted to the assignment owner teacher to inspect append-only audit histories.

Verified locally: `tests/unit/appeals.test.ts` (9 passed), `tests/unit/appeals-and-audit.test.ts` (4 passed), `tests/unit/audit-service.test.ts` (5 passed), `tests/e2e/specs/appeals.spec.ts` (passed), lint (Oxlint), typecheck, OpenAPI validation, production build, host E2E, and containerized E2E with disposable PostgreSQL (36 passed).

## Evaluation UI completion — FR-EVAL-01..13 (2026-10-26)

All 13 requirements for the Evaluation UI module are verified and certified against PRD §7.5, §8.3, and the QA test tracker:

- **FR-EVAL-01 (Single-Page Mobile-First Criterion Sections):**
  Group evaluation renders all criteria on a single page, partitioned into distinct sections with responsive MUI layout.
- **FR-EVAL-02 (Artifact Links & Missing Fallback):**
  Displays item names and artifact links on both sides. When no link is provided, displays exact fallback text: `"อาจารย์ยังไม่ได้ระบุ"`.
- **FR-EVAL-03 (6-Point Forced Choice Scale):**
  Enforces 6-point forced-choice scale (1 ซ้ายดีกว่ามาก to 6 ขวาดีกว่ามาก) without a neutral 50/50 option, with accessible names (`aria-label`) on all choices.
- **FR-EVAL-04 (Autosave Drafts & Status):**
  Autosaves drafts automatically on answer change with 800ms debounce (<= 2s) and displays `"บันทึกแล้ว เมื่อ HH:MM"`. Answers persist across browser reloads.
- **FR-EVAL-05 (Always-Enabled Submit & Incomplete Warning):**
  Submit button remains clickable even if incomplete, opening a confirmation modal detailing the exact number of unanswered items before confirming.
- **FR-EVAL-06 (Unlimited Re-submissions & Revision History):**
  Supports unlimited re-submissions prior to deadline. The latest submission is used for score calculations while retaining full revision history.
- **FR-EVAL-07 (Immediate Progress Tracking):**
  Progress indicators (`X / Y คู่`) update immediately per criterion chip and overall sticky summary bar upon selection.
- **FR-EVAL-08 (Post-Deadline Read-Only Lock):**
  Past-deadline assignments immediately disable submissions and switch the interface into read-only display.
- **FR-EVAL-09 (Unsubmitted Draft Exclusion):**
  Unsubmitted drafts are strictly excluded from score calculation while remaining visible to the author.
- **FR-EVAL-10 (Countdown Timer < 48 Hours):**
  Displays an urgent countdown banner (`⏳ เหลือเวลาอีก XX ชั่วโมง YY นาที`) when the deadline is under 48 hours away.
- **FR-EVAL-11 (Separated Group & Individual Tabs):**
  Group and Individual evaluations are strictly segregated into independent tabs with separate draft lifecycles and submit buttons.
- **FR-EVAL-12 (Group Size m <= 2 Mathematical Explanation):**
  Hides individual evaluation for groups with $m \le 2$ members, displaying the exact mathematical reason: $C(m-1, 2) = 0$ pairs per evaluator per PRD §8.3.
- **FR-EVAL-13 (Offline Queue & Auto-Sync):**
  Client-side `localStorage` queue buffers pending answers during network disconnection and auto-synchronizes upon browser `online` event reconnection.

Verified locally: `tests/unit/evaluation-ui.test.ts` (12 passed), `tests/unit/evaluation-submission.test.ts` (7 passed), oxfmt format check, oxlint (0 errors), tsc typecheck (0 errors), Redocly spec lint, and Next.js production build.

## Earlier verification

Testing was paused at the user's request on 2026-10-20. Completed checks: lint, TypeScript, OpenAPI validation and production build; host E2E 27/27 (9 scenarios × 3); Docker E2E 9/9 after declaring a UTF-8 locale for Thai download filenames. Business coverage measured 97.52% lines, 90.34% branches and 97.14% functions. The Docker unit run exposed that the redaction probe inherited `LOG_LEVEL=silent`; the probe now explicitly enables its own logger. Further testing and final evidence consolidation are deferred.

## Evidence Index

- `docs/evidence/fidelity.json`: disabled duplicate rule → existing test fails, exact source restored.
- `docs/evidence/refactoring.json`: before/after suite passes and existing unit test hashes unchanged during the scoped service refactor.
- `docs/evidence/container-exit.json`: a real failing assertion in the unit image returns exit 1.
- `docs/evidence/production-guard.json`: production seed/cleanup 404 despite test flags/correct token, non-root runtime.
- `docs/evidence/dev-environment.json`: isolated development Compose startup and restart timings; the user's existing port 3000 was left alone.
- `docs/evidence/performance-baseline.json`, `performance/baseline.json`: actual local benchmark.
- `docs/evidence/performance-gate.json`: deliberate threshold failure, not a network/setup failure.
- `docs/evidence/logging.json`: actual structured log samples and privacy checks.
- `docs/evidence/npm-audit-*.json`: production and full dependency findings without hiding the outstanding dev-only advisory.
- `docs/evidence/secret-scan-summary.json`: real redacted Gitleaks scan summary.
- `docs/coverage/index.html`: scoped business-rule/service coverage; not whole-application coverage.

## Explicit Limitations

No Git remote or staging URL has been selected for this checkout. The GitHub login being available does not identify the intended repository/visibility. No Issues, Project, deployment, ruleset or fabricated CI result were created on an arbitrary target. `docs/github-setup.md` gives the remaining configuration and proof steps.

No student/team names, human code approvals, clean-clone observations from other machines, remote screenshots or unmeasured timings are invented. Current authentication is the implemented PostgreSQL cookie session, not Neon Auth as a hosted provider.

# Student appeals (2026-10-25)

- FR-APPEAL-01: Assignment detail now includes an Appeals tab after finalization (or for existing request history). Assignment students submit a required explanation within seven days of the server's finalization timestamp. One request per student/finalization/generation; server rejects expired, duplicate, stale and unauthorized requests.
- FR-APPEAL-02: only the owning teacher can read all requests and record an explanation with either uphold or a bounded personal final-score override. Students see only their own requests and responses. Teacher resolution is permitted after the intake window; resolved and superseded requests are immutable.
- Requests and decisions live in the existing versioned assignment JSONB aggregate. The repository atomically writes the mutation and append-only appeal/score-override audit. Concurrent duplicates/decisions are revalidated on retry. No schema migration is needed for appeals.
- Override changes only the appellant's final total in student results, teacher results, and XLSX/CSV individual summaries. Original ballots and finalized snapshot remain unchanged. Reopen/refinalize or pair regeneration starts a different result cycle; old appeals remain history and cannot alter the new result.
- Local verification: 3 appeals E2E journeys passed (1280px, 390px and guarded isolated PostgreSQL authorization/privacy/concurrency/audit). No production database was changed. Deployment and hosted authentication are not externally verified.
- Required checks passed: 156 unit/integration tests, lint, typecheck, OpenAPI lint, production build, coverage (97.34% lines / 100% functions / 87.45% branches), and mutation fidelity. Excel/CSV regression verifies nonzero and zero personal-total overrides without changing another student's result.
- Current limitations: no email/push delivery, attachments or multi-message conversation; users read requests/responses in the Assignment tab. Existing broader scoring/finalized-output snapshot gaps in `prd-gap-audit.md` remain separate work.

## Raw comparison and confirmed identity export (2026-10-25)

FR-EXPORT-03 and FR-EXPORT-04 are implemented locally on
`feat/scoring-engine-completion`, together with the seven outstanding Oxfmt fixes.
Teacher pairwise results now provide a raw CSV export dialog. The default mode
uses random pseudonyms for evaluators and compared items, consistent within a file
and rotated between downloads. Identity-bearing pair/response IDs and names/emails
are omitted. This is a separate raw CSV download; the four-sheet summary XLSX
and its formula-version Metadata (FR-EXPORT-06) remain available.

An explicit opt-in and separate confirmation checkbox are required to include
real evaluator ID/name/email. The server independently enforces a teacher session,
assignment ownership, classroom ownership when linked, and boolean confirmation.
It loads identities through parameterized SQL, then must durably record an
`EXPORT_IDENTITY` event before returning CSV. Audit failure returns no identified
file. The audit contains report/mode/count/generation/version, without copying the
exported personal details. Responses are no-store attachments. Demo downloads are
disabled because they cannot persist the required audit.

Exports read current pairwise data or finalized snapshot inputs, omit drafts,
archived/dangling comparisons and mismatched evaluators, and retain EXCLUDED
status for analysis. UTF-8 BOM, CSV quoting and formula-injection escaping reuse
the existing encoder. No database schema or CI changes were needed. General
identity-read auditing outside this export remains outstanding.

The two formerly skipped export tests now have real privacy/authorization/audit
assertions. Six additional tests cover stable per-file pseudonyms, rotation,
identity-bearing IDs, failed audit, strict confirmation, frozen inputs,
cross-classroom access, formula escaping and empty exports. Local verification: all 184 unit/integration tests pass with zero skips; Oxfmt,
Oxlint, TypeScript, OpenAPI and production build pass. Configured coverage passes
(97.35% lines, 100% functions, 87.81% branches), and fidelity detects the mutant
and restores source. Browser/E2E tests and hosted deployment are not claimed as
verified in this delivery. The local Docker daemon is unavailable, so the new
identity SQL/audit flow has not been verified against PostgreSQL in this request.
No hosted database was accessed or migrated.
