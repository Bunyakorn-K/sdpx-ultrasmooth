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

## Final Verification

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
