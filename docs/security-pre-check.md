# Security Pre-check — WS08

Checked 2026-10-20 against actual source, local PostgreSQL tests, npm audit and redacted secret scans. This report does not claim remote Dependabot/CodeQL/Secret scanning settings are active before the first GitHub run.

## Relevant OWASP Risk Areas

1. Broken access control: an authenticated student must not read or manage another assignment.
2. Authentication failures: passwords/session tokens must be protected and repeated login attempts limited.
3. Injection and unsafe input handling: all SQL parameters, JSON bodies, resource IDs and exported/imported values need bounded handling.

## Checks and Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| SQL parameterization | Queries separate parameter values from SQL; TCP adapter assembles only `$n` placeholders | repository code + PostgreSQL E2E |
| Ownership and membership | Server checks reads, question edits, start/stop, groups and votes | unit and real API E2E including outsider 403 |
| Safe account DTO | No password_hash in login/register/session response | auth service and API E2E |
| Safe errors | No stack trace or connection string in server errors; malformed JSON/IDs use 400 | `tests/unit/http-security.test.ts` |
| Brute-force restriction | Shared PostgreSQL per-email-hash counter, 10 attempts/15 min | real API E2E returns 429 |
| Test support blocked in production | 404 even with opt-in flags and correct token | actual production container probe in `docs/evidence/production-guard.json` |
| Isolated test data only | Explicit token + PostgreSQL driver + `*_test` database; teardown by unique run ID | fixture guard tests and E2E |
| Structured log privacy | Request/business events have requestId/duration; sensitive fields redacted | actual container log sample + logger regression test |
| Production dependencies | Zero npm audit findings after UUID override | `docs/evidence/npm-audit-production.json` |
| Development dependencies | Five affected-package findings from the braces/glob toolchain, tracked below | `docs/evidence/npm-audit-all.json` |
| Git history secrets | No findings in all locally available commits | `docs/evidence/secret-scan-summary.json` |
| Current source secrets | No findings after excluding generated build/cache artifacts | same summary; actual scan uses `--redact` |
| Remote scanners / alerts | Workflow and Dependabot configuration prepared; not yet executed remotely | `.github/workflows/security.yml`, `.github/dependabot.yml` |

The initial source scan flagged six generated Next development cache/key artifacts under `.next-routes`. All alternate `.next*` directories are gitignored and excluded from source scanning. No raw secret value was copied into this report or evidence. This does not excuse a real source/history finding: such a finding would require revocation and separate remediation.

## Development-only Advisory Disposition

- npm reports high findings along `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`.
- The checked registry version of braces is 3.0.3, which is still within the advisory range; there is no patched compatible release to apply at the time of this check.
- `npm audit fix --force` proposes downgrading the Next.js ESLint configuration to 14.x, conflicting with this Next.js 16 project. That is not an acceptable unreviewed fix.
- Production installs omit the development toolchain and pass a separate production audit gate.
- Keep this as tracked technical debt for the next compatible fix, and review any untrusted changes to lint/glob configuration. No severity has been suppressed or rewritten in the audit output.

## Fixed in WS08

| Problem | Files | Fix | Regression protection |
| --- | --- | --- | --- |
| Unlimited login attempts | auth-rate-limiter/http-handlers/schema | Atomic persistent counter keyed by normalized-email hash | real API 401 ×10 then 429 |
| Malformed JSON/IDs became misleading server failures | shared/server/http.ts | bounded object parser and UUID validation | SEC01/SEC03 tests |
| Test endpoints could be dangerous if accidentally enabled | test-environment and test routes | deny production unconditionally plus isolated-db/token guard | SEC06 tests + real production Docker probe |
| Sensitive log fields | shared/server/logger.ts | field allowlist at call sites plus Pino redaction | SEC08 test + actual logs |
| Vulnerable ExcelJS UUID dependency | package.json/package-lock.json | scoped override to UUID 11.1.1 | real workbook import/export + production audit |
| Node/ExcelJS module interop | Excel service and browser test harness | default import for application, explicit CommonJS require in Node-only workbook test | unit imports + browser export workbook assertions |

## External Follow-up

When the repository/staging target is supplied: inspect actual Dependabot/CodeQL results, enable GitHub Secret scanning and branch protection, and prove a failed PR cannot merge. Those are not represented as complete by the local tests.
