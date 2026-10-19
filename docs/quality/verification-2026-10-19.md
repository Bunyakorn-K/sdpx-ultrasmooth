# Local verification evidence — 2026-10-19

- Initial regression suite: 54 existing unit tests passed before new behavior.
- Added role, enrollment, voting, managed-session, results-access and signup UI
  tests. No pre-existing unit/E2E assertion was edited or removed.
- Real disposable Postgres verified migrations, scoped enrollment, duplicate-name
  rejection, concurrent publication, self-vote exclusion and safe identity linking.
- An intentional self-vote guard mutation was detected; source restored and tests
  rerun green. Existing `TEST_PLAN.md` historical evidence remains separate.
- Repeated browser regression: 18 cases (6 tests x 3) passed after fixing the
  pre-hydration form input bug in application code.
- Docker unit suite passed in an isolated Compose environment. Browser-container
  verification and final dependency-upgrade regression are recorded separately
  in the final handoff; do not infer them from an earlier image run.
- Desktop/mobile landing page was visually inspected; 390px viewport had no
  horizontal overflow. Screenshots contain only public page content.
- Managed Auth integration has not yet been tested against a real linked branch.
  `test:auth:live` must complete after the owner signs in and supplies runtime config.
- No commit, push, pull request, external GitHub setting change or deployment.

## Final checks after security dependency updates

- Next.js 16.4.2 production build completed successfully.
- Vitest 4.1.12: 91 tests passed; final coverage run took 4.39s.
  Coverage summary: 28.41% of all source lines. Integration/browser execution is
  separate and is not counted in that unit coverage figure; no full-coverage claim.
- Full Chromium regression: 18/18 passed with three repetitions; final targeted
  database workflows also passed after assignment transaction and role checks.
- Rebuilt Docker browser image using the updated lockfile: 6/6 E2E tests passed.
  The earlier dedicated Docker unit image passed 87 tests before the four new
  managed-form tests and security dependency update; the final host suite is 91.
- TypeScript/OpenAPI lint passed (9 pre-existing OpenAPI response warnings).
- `git diff --check` passed. Existing test files were not edited.
- Final safe preview: legacy sign-in returns 404, anonymous account returns 401,
  unconfigured managed session route returns 503, signup is visibly disabled.
- Final local public-journey k6 run: 651 requests, 0 failures, p95 42.03ms.
- Audit: no high/critical advisories; one moderate nested esbuild advisory remains
  with the rationale recorded in security-pre-check.md.
- Temporary database containers were removed. Preview remains on loopback only,
  with fixture authentication disabled. No database or auth credentials were printed.
