# Loop Notes

## WS-01 deploy loop

- Repository: `Bunyakorn-K/sdpx-ultrasmooth`
- Current implementation baseline: `c213423 feat: merge HeroUI landing page`
- Local package install: `bun install --frozen-lockfile`
- Local unit verification: `bun run test` — 2 tests passed in 1.25s on 2026-08-11.
- Local browser verification: `bun run test:e2e` — 1 Chromium test passed in 2.3s on 2026-08-11.
- Production build verification: `bun run build` — compiled successfully in 1.57s after fixing the `NextConfig` type import on 2026-08-11.
- Commit-to-live time: not measured for this working-tree change because no commit or deployment was requested or performed.

## Live URL observations

- Staging `https://sdpx-ultrasmooth-s1ux.vercel.app/`: HTTP 200 observed on 2026-08-11; the response contained the current hero heading and `University Evaluation System` label. The HTML title was `PairEval — Pairwise Student Evaluation`.
- Production `https://sdpx-ultrasmooth.vercel.app/`: HTTP 404 observed on 2026-08-11. This is recorded as an observation, not a deployment claim.

## Iteration log

1. Unit test suite initially passed with the existing Vitest harness.
2. Adding the Playwright spec caused Vitest to collect the E2E file; restricting Vitest `include` to `src/**/*.test.{ts,tsx}` restored the unit boundary.
3. `next.config.ts` initially used an invalid `NextConfig` type import; `bunx tsc --noEmit` reproduced TS2749. The config now uses `import type { NextConfig } from "next"`.
4. Unit, E2E, and build verification were rerun after the config fix.
5. On 2026-08-24, `@vitest/coverage-v8` was installed pinned to the installed vitest version and the Vitest `include` gained `tests/**/*.test.{ts,tsx}` so unit tests can live under `tests/unit/`. The Playwright spec stays outside the unit suite because its `.spec.ts` suffix does not match the `.test.*` include pattern, so the boundary from note 2 still holds.
6. On 2026-08-24, POST `/api/test/seed` and POST `/api/test/cleanup` App Router handlers were added behind an in-memory store; both return 404 when `NODE_ENV=production`. The unit suite now reports 5 passing tests in about 1.3s on 2026-08-24.
7. On 2026-08-24, `/api/test/*` paths were added to `docs/openapi.yaml`, and Redocly CLI became the reproducible OpenAPI validation command (`bun run lint:api`).
