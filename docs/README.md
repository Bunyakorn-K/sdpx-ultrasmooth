# Documentation

Start with the repository [README](../README.md) for current setup and commands.

| Area | Documents |
| --- | --- |
| Architecture and contracts | [Architecture](architecture.md), [ERD](erd.md), [OpenAPI](openapi.yaml) |
| Product | [Backlog](backlog.md), [Traceability](traceability.md), [Unit brief](product/unit-brief.md) |
| Setup | [Neon Auth](setup/neon-setup.md), [Docker environment history](setup/setup-steps.md) |
| Quality | [Refactoring](quality/refactoring-plan.md), [Auth/enrollment](quality/refactoring-auth-and-enrollment.md), [Security review](quality/security-pre-check.md), [Historical verification](quality/verification-2026-10-19.md) |
| Workshops | [WS-01 through WS-08](workshops/ws-01-08-status.md), [Loop metrics](workshops/loop-metrics.md) |
| Performance | [Measurements and limits](performance/performance-report.md), [k6 script](../performance/load-test.js) |
| Decisions | [ADRs](adr/), [Early homepage decision](decisions/0001-homepage-scope.md) |
| Testing | [Test plan](../TEST_PLAN.md) |

Reports are generated using `bun run test:coverage` and `bun run test:e2e`.
Their output belongs in ignored `coverage/`, `playwright-report/`, and
`test-results/` directories, not in documentation source control. CI uploads
reports as artifacts. Historical measurements describe their recorded run and
do not establish the current deployment state.
