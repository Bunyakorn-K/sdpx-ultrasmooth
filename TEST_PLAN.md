# Peerly Test Plan

Source rules: `memory-bank/units/*/unit-brief.md`; stories/AC: `docs/backlog.md`.

## Business Rules and Harness

| Rule / Function | Unit/characterization evidence | E2E evidence |
| --- | --- | --- |
| Create teacher-only work; future deadline; generated code | `tests/unit/assignment-service.test.ts` | API create + browser Excel/create |
| Join draft work idempotently, deny closed/expired | domain and assignment service tests | PostgreSQL join API |
| One group per student; teacher creates empty group | model + assignment unit tests | group/create/join browser/API |
| Owner-only start/stop/questions | model + assignment unit tests | owner denial + start/stop API |
| Start needs questions/two populated groups | model + assignment unit tests | browser insufficient-group case |
| Integer scores 1–5, all questions, no self/late/closed votes | model tests | real API invalid/self/closed votes |
| Once per student/other group, including concurrency | model + service tests | two simultaneous real requests → 201/409 |
| Safe role-specific visibility / unauthorized detail | services + assignment tests | outsider 403 and other-ballot hiding |
| Password hash not returned, correct/incorrect credentials | auth service tests | register/login/logout and browser form |
| Shared persistent login-attempt limit | API boundary | real database rate-limit E2E |
| Malformed JSON/body limits, origin, IDs, private errors | `tests/unit/http-security.test.ts` | protected request paths |
| Production test endpoint denial and isolated-test guard | `tests/unit/test-environment.test.ts` | seed/cleanup without token returns 404 |
| Excel valid column/header parsing and invalid/oversized input | `tests/unit/excel-import.test.ts` | import preview and explicit save |
| Excel output worksheet names, answer counts, average | existing scoring tests | downloaded workbook cell checks |

## Reusable Test Support

- `tests/factories.ts`: typed User and Assignment factories + populated voting fixture.
- `tests/fakes/fake-assignment-repository.ts`: implements the production `AssignmentRepository` interface, including version checks.
- Existing `tests/model.test.mjs` and `tests/services.test.mjs` remain as behavior characterization tests.
- `tests/e2e/pages/`: readonly locators and domain-named methods; assertions remain in specs.
- `tests/e2e/fixtures/`: automatic seed/cleanup using unique users/run IDs; teardown runs on failure.
- `tests/e2e/seed/`: generated test identities/passwords in memory and relative future dates; no hardcoded expiry date.

## Fidelity Check (WS03)

`npm run test:fidelity` temporarily disables only the duplicate-vote rule, runs its existing test and restores the exact source. Machine evidence: `docs/evidence/fidelity.json`.

- Removed rule: duplicate-vote rejection.
- Existing test that became red: `duplicate vote is rejected`.
- Mutation exit code: 1.
- Source restored byte-for-byte; existing characterization test SHA-256 hashes unchanged.
- An independently generated intentional failing test also exited with code 1.
- Container-specific exit-code evidence is recorded separately in `docs/lab-status.md`.

## Coverage

`npm run test:coverage` generates HTML, LCOV, JSON summary and JUnit XML. The gate covers domain policies, assignment/auth business services and password hashing: lines ≥80%, functions ≥80%, branches ≥65%.

The scope deliberately excludes UI, Next.js cookie plumbing, test-data infrastructure and database adapters; browser/database tests cover those integrations. Do not describe this as whole-application coverage. The measured report is copied to `docs/coverage/`; current numbers and timings are in `docs/loop-metrics.md`.

## Execution

- Unit suite must finish under 10 seconds; observed local/container runs are recorded in evidence.
- `npm run test:e2e` starts an isolated server/build directory unless `BASE_URL` is supplied.
- Real database scenarios require `E2E_DATABASE_ENABLED=1`, `DATABASE_DRIVER=postgres` and a disposable `*_test` database.
- `npm run test:e2e:repeat` executes each case three times; retries do not replace repeatability checks.
- Production test endpoints must remain 404 even if test flags are accidentally set.

## Remaining External Verification

- Staging Neon transport/performance and remote CI run.
- Real team code review and branch-protection proof.
- GitHub issue IDs/URLs remain local US references until a repository is selected.
