# Loop Metrics — WS06

Measurements below are local observations on 2026-10-20. Remote CI and staging have not run for this checkout; local timings are not presented as CI timings.

| Metric | Local evidence | Remote CI / staging |
| --- | --- | --- |
| Unit/service test loop | 46 tests; see final verification and coverage evidence | Not measured |
| E2E repeatability | 9 scenarios repeated 3 times against disposable PostgreSQL; see final verification | Not measured |
| Development Compose startup | 16.8 s with existing base/dependency cache, HTTP 200 | Not applicable |
| Development Compose restart | 9.4 s after compose down, HTTP 200 | Not applicable |
| Complete pipeline | Individual local gates exercised; no synthetic pipeline duration | Not measured |
| Commit → staging lead time | No selected Git remote or staging target | Not measured |
| Deployment frequency | No deployment performed | Not measured |
| Performance loop | 120 s load profile; 122.5 s including orchestration | Not measured |

## Slowest step

The local performance profile deliberately takes two minutes. CI job timing cannot be inferred from local runs. The first browser/dependency image build includes downloads; cached source-only rebuilds reuse those layers. After the first real CI run, use its job durations to identify the actual bottleneck.

## Pipeline debugging pushes

0 pushes were made. Lint, TypeScript, OpenAPI, build, unit, E2E, container and threshold checks were reproduced locally. Remote branch protection, staging secrets and a repository target still require configuration described in [github-setup.md](github-setup.md).

## Fidelity and refactoring

Disabling duplicate-vote rejection made the existing test fail with exit 1; the source was restored exactly. The scoped service refactor passed the same 44 tests before and after with unchanged test hashes and 0 reverts. Later regression additions bring the current suite to 46. Evidence lives in `docs/evidence/fidelity.json` and `docs/evidence/refactoring.json`.

The container-only Excel filename regression came from a POSIX locale: Chromium returned `download` for the Thai filename. Re-running the unchanged export test with `LANG=C.UTF-8` and `LC_ALL=C.UTF-8` passed. The test and runtime Docker stages now declare that locale explicitly.
