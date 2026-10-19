# WS-01 through WS-08 evidence

Scope: only the eight `lab.md` files in
[CE-SDPX/SDPX-AI](https://github.com/CE-SDPX/SDPX-AI), accessed 2026-10-19.
No lecture, before-class, or later-workstream files were used as requirements.
This checklist distinguishes repository artifacts from externally verified results.

| Lab | Repository implementation/evidence | Still requires evidence or external work |
| --- | --- | --- |
| [WS-01](https://github.com/CE-SDPX/SDPX-AI/blob/main/WS-01-RUN-first-deploy/lab.md) | Landing page based on `public/design.jpg`; nav/CTA test IDs; Bun commands and env placeholders | Current deployment URL verification and commit-to-live timing; no release performed |
| [WS-02](https://github.com/CE-SDPX/SDPX-AI/blob/main/WS-02-RUN-req-design/lab.md) | `backlog.md` has 11 story drafts with AC; architecture/ERD; OpenAPI; intent and unit briefs | Transfer reviewed stories to GitHub Issues/Project and record human decisions |
| [WS-03](https://github.com/CE-SDPX/SDPX-AI/blob/main/WS-03-RUN-unit-test/lab.md) | Unit suite, existing fake repository/factories, coverage tooling, smoke test, `TEST_PLAN.md` | Each team member must explain fidelity and tests; recorded local results are not proof of team participation |
| [WS-04](https://github.com/CE-SDPX/SDPX-AI/blob/main/WS-04-RUN-e2e/lab.md) | Page object, existing seed/cleanup fixtures, walking-skeleton and assignment-group feature tests; no new fixed sleeps | Historical fixture tests use an in-memory store; real database workflow uses a disposable PostgreSQL instance. Live managed Auth remains pending |
| [WS-05](https://github.com/CE-SDPX/SDPX-AI/blob/main/WS-05-RUN-docker/lab.md) | Multi-stage Dockerfile; non-root runtime/browser stage; dev/test Compose; tmpfs Postgres; frozen Bun installs | Confirm one-command setup and timings on every team member's machine |
| [WS-06](https://github.com/CE-SDPX/SDPX-AI/blob/main/WS-06-RUN-cicd/lab.md) | CI uses frozen Bun dependencies, build/lint/unit/E2E, concurrency, permissions, reports and production environment | Successful remote run URL, main branch protection and blocked-merge screenshot, production approval settings, fresh loop metrics |
| [WS-07](https://github.com/CE-SDPX/SDPX-AI/blob/main/WS-07-RUN-perf/lab.md) | Tagged k6 public journey with think time/thresholds; correlation IDs; structured redacted group-route logs | Local public-page measurements do not establish authenticated voting performance or staging performance |
| [WS-08](https://github.com/CE-SDPX/SDPX-AI/blob/main/WS-08-RUN-code-quality/lab.md) | Security review/fixes/tests, auth ADR, refactoring notes; existing tests preserved | Remote Dependabot/CodeQL/history scanning, human review and explanations remain required |

The old stored reports are historical artifacts. They are not fresh verification
of this change. Deployment and GitHub settings were not modified during local work.
