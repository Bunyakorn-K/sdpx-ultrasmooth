# WS01–WS08 Implementation Status

Source instructions in `docs/labs/` are preserved. This document separates implemented artifacts and locally verified evidence from tasks that require a real repository, hosting account or team member.

For requirement-by-requirement implementation mapping and explicit specifications, see [PairEval PRD](labs/pairwise_evaluation_prd.md). Business coverage measured >96% across domain rules, feasibility solver, scoring engine, quality signals, and roster parser.

| Lab | Implemented artifacts | Verification | External work still pending |
| --- | --- | --- | --- |
| WS01 | AGENTS.md, tech-stack, `.env.example`, ignore rules, actual application | local build and HTTP readiness; configured commands | repository selection, commit/push review, live URL, actual commit-to-live measurement |
| WS02 | 11 stories + AC/DoD, component/ER diagrams, OpenAPI, intent and 3 unit briefs | OpenAPI validates; API maps to local story IDs | create/assign GitHub Issues, labels and Project board |
| WS03 | reusable typed fakes/factories, unit/security/Excel harness, TEST_PLAN, coverage report | passing suite under 10 s; duplicate-rule mutation makes existing test fail | team explanation/review of tests |
| WS04 | page objects, auto fixture seed/cleanup, dynamic data, smoke + feature/API E2E, HTML/JUnit/video/trace config | real PostgreSQL scenarios and repeatability run; final counts below | GitHub issue links replace local US references |
| WS05 | multi-stage Dockerfile, non-root runtime, health check, development/test Compose with tmpfs test DB | container unit/runtime probes; development startup/down/start with HTTP 200; intentional test failure returns nonzero | another team member's clean-clone proof |
| WS06 | pinned-action CI/CD, coverage/JUnit summaries, conditional staging deployment, security workflow/Dependabot, setup guide | workflow/configuration prepared and local commands exercised | remote CI run URL, Vercel secrets/project, branch protection and blocked-merge screenshot, production reviewers |
| WS07 | k6 real teacher journey, baseline JSON, failure-gate probe, request/business JSON logging, performance CI job | local 2-minute production-container benchmark + 1 ms threshold fails with exit 99 | repeat on the team's actual staging/Neon target; CI performance run |
| WS08 | review/refactoring plan, scoped before/after record, security fixes/regression tests, ADRs | unchanged scoped-refactor tests, security probes/audits, redacted history/source scan | real human review and remote security-alert review |

## Pair regeneration (2026-10-25)

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
Evaluation UI/Reporting PRD compliance. Autosaved drafts, versioned resubmission,
independent group/individual deadlines and criteria editors, instructor extra/self
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
