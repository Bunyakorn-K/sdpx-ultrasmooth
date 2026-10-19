# Intent: PairEval

## Intent statement

Help university teachers evaluate group work using pairwise comparisons while
students collaborate in assignment-scoped groups and vote on other groups.

## Users and access

Exactly two product roles exist: teacher and student. Teachers manage only their
own classrooms and view voting results. Students join a classroom with an
invitation code, create/select groups only under an existing open assignment,
and submit comparisons excluding their own group. Students do not receive scores,
rankings, or others' votes. Personal completion counts are permitted.

## Decisions already made

- Next.js with strict TypeScript, App Router for new product routes, Tailwind CSS.
- Lakebase Postgres through Neon, retaining Drizzle ORM and the existing driver.
  This supersedes the earlier Supabase-hosting plan at the owner's request.
- Neon managed Better Auth, starting with email/password signup and sign-in.
- New users are students. Exact server-configured managed subject IDs authorize
  teacher eligibility; classroom memberships continue enforcing ownership.
- Existing six-point forced-choice pairwise engine and quality-index scoring.
- Groups, answers, and one-per-user selections are scoped to assignments; voting
  publication locks enrollment. Existing CSV-imported groups remain compatible.
- Visual direction: white space, serif headings, pastel cards, and illustrations
  based on the owner's `public/design.jpg` reference.
- Scope of course guidance: only WS-01 through WS-08 `lab.md` files.

## Success criteria

- A real managed signup can be read back as the current user without logging
  credentials. This remains unverified until the owner signs in to Neon.
- Students cannot self-promote, vote for their own group, access other assignments'
  groups, or read voting results; server-boundary tests cover these rules.
- Relevant unit/browser tests, OpenAPI validation and production build pass.
- External CI, deployment, performance and review evidence are reported honestly,
  with local evidence clearly separated from production readiness.

## Out of scope

Admin role, public teacher self-enrollment, LMS/LTI, native mobile apps,
multi-criteria scoring, post-publication group edits, and automatic deployment
without a user request. Google OAuth configuration is a later managed Auth option,
not a completed feature of the initial email/password implementation.

## Status

Implementation and local verification in progress, 2026-10-19. Managed Auth
provisioning, real signup proof, human review and remote delivery remain pending.
