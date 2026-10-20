# Tech Stack

## Decision Summary

- Project: Peerly / pair-eval
- Domain: group peer evaluation
- Date: 2026-10-20
- Team members: not supplied; no names inferred

## Frontend

- Next.js 16 App Router, React 19, TypeScript strict
- MUI 9 + Emotion; shared theme + responsive CSS
- Rationale: retain the existing project and the user's explicit MUI/design requirements

## Backend

- Next.js Route Handlers as HTTP adapters
- Application services with repository interfaces; business policies independent of React/SQL
- Auth: scrypt password hashes, opaque sessions stored as SHA-256 hashes, HttpOnly/SameSite cookies
- Rationale: same-origin application with server-side role/ownership enforcement; no token in browser storage

## Database

- Neon PostgreSQL over HTTP in production (`DATABASE_DRIVER=neon`, default)
- PostgreSQL 17 over TCP in Docker/CI (`DATABASE_DRIVER=postgres`)
- Parameterized SQL in both transports
- Assignment aggregates stored in JSONB with optimistic version checks; users/sessions/rate limits relational
- Rationale: preserve Neon requirement and make Docker tests work without depending on Neon networking

## Deployment

- Prepared for Vercel staging or the non-root Docker runtime
- Staging URL: not configured
- Commit-to-live time: not measured; no remote/deployment has been created for this checkout
- Auto-deploy and branch protections: workflow/configuration prepared; remote verification pending

## AI Tools

- Coding agent: Codex
- Review policy: AI-generated changes need human review; this work does not claim a team review has happened
- Verification commands: see root `AGENTS.md` and `TEST_PLAN.md`
