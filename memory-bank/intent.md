# Intent: PairEval Service

## Intent Statement
Enable instructors to accurately evaluate individual contributions within group projects by using pairwise comparisons, reducing absolute scoring bias and the free-rider problem.

## Business Context
- **Problem:** Instructor rating bias and equal grades for free-riders in group work.
- **Users:** Instructors (setup and finalize scores), Students (evaluate peers and other groups).
- **Value:** Fair, bias-reduced, and data-driven individual scores.

## Success Criteria
- Participation rate ≥ 90%.
- Median time-on-task ≤ 15 minutes per assignment.
- Individual score dispersion standard deviation ≥ 0.5 points.

## Decisions Already Made
- Framework: Next.js with TypeScript for end-to-end type safety across client and server.
- Persistence: PostgreSQL via Supabase with Drizzle ORM as the exclusive data access layer.
- Evaluation Scale: 6-point forced-choice comparison scale with no neutral middle option to eliminate hesitation bias.
- Scoring Algorithm: Quality Index (q) with configurable score floor (e.g. 60%) to prevent zero-sum penalization.
- Environment & Testing: Multi-stage Dockerized containers with ephemeral test database for CI/CD consistency.

## Out of Scope (v1.0)
- Full LMS integration (LTI 1.3).
- Rubric-based absolute scoring.
- Mobile native app.

## Status
In Progress — WS-02

