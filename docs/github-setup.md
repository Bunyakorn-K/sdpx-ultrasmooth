# GitHub and Staging Setup

No remote is currently attached to this checkout. These are prepared instructions, not claims that remote settings were applied.

## Repository / backlog

1. Choose the authorized repository and organization; connect it as `origin`.
2. Review the current work, commit with Conventional Commits, create `develop`, and push.
3. Create labels `user-story`, `bug`, `enhancement`, `tech-debt` and a Project board with To Do / In Progress / Done.
4. Create Issues from US00–US10 in `docs/backlog.md` using the issue template. Assign actual team members; retain the local US IDs in issue bodies and tests.
5. Add real issue/Project URLs back to backlog and unit briefs.

## CI/CD

- Required jobs: `lint-and-unit-test` and `e2e-tests` from `.github/workflows/ci.yml`.
- Actions are pinned to verified commit SHAs; Dependabot prepares updates.
- Local PostgreSQL service is disposable. `DATABASE_DRIVER=postgres` is required; Neon HTTP is not used against a TCP PostgreSQL service.
- Reports: coverage HTML/LCOV/JSON + JUnit, Playwright HTML/JUnit/traces/videos, k6 JSON summary.
- CodeQL and redacted full-history secret scanning are configured in `security.yml`; their first remote run has not happened yet.

## Staging / production

- Create GitHub Environments `staging` and `production`.
- Set production Required reviewers to real team members. Production deployment is deliberately not automated by this workflow.
- Connect a Vercel project and configure `DATABASE_URL` in the hosting environment; `DATABASE_DRIVER=neon` is the production choice.
- Configure `APP_ORIGIN` if using a fixed canonical origin behind a proxy.
- Add GitHub Secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- Enable deployment only after configuring the target by setting repository Variable `DEPLOY_STAGING=true`.
- Set `STAGING_URL` as a Variable if the dedicated staging URL is stable.
- Use a dedicated test teacher in staging, with `K6_USER_EMAIL` / `K6_USER_PASSWORD` as Secrets; set `RUN_PERFORMANCE=true` only for the team's staging.
- Vercel preview access protection must allow the CI readiness/load check; do not turn off production authentication to make tests pass.

The deploy job only runs after checks pass on a push to `develop`; no publication occurs on an untrusted pull request. The script verifies `/api/health` before declaring deployment successful. Its duration is deploy-to-health, not a fabricated commit-to-live measurement.

## Branch protection proof (remote work pending)

On `main`: require PR + one review, both status checks, up-to-date branch, and no force pushes.
Create a disposable branch/PR with an intentionally failing test; confirm the checks fail and Merge is blocked; capture the actual screen in `docs/screenshots/`; close the PR without merging. Do not weaken assertions on the real branch or fabricate this evidence.

## Secret scanning

Enable GitHub Secret scanning and Dependabot alerts in repository settings. If an actual historical secret is found, revoke it; deleting a line alone is insufficient. Never paste the secret into a report. Record rule IDs, counts and file paths with redaction.
