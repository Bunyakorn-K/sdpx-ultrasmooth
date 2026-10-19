# Teacher/student backlog

These are repository story drafts, not newly created GitHub Issues. There is no
admin role. Database `INSTRUCTOR` is the existing storage name for teacher.

| Story / AC | User story | Acceptance criteria | Implementation / evidence |
| --- | --- | --- | --- |
| HOME-01 | As a visitor, I want a clear landing page so I can understand PairEval. | Given `/`, show purpose, teacher/student journey, sign-in and registration; fit mobile without horizontal overflow. | `src/pages/index.tsx`; homepage unit/smoke tests; desktop/mobile visual review |
| AUTH-01 | As a student, I want to register with email/password so I can join my class. | Successful managed signup creates an identity; session readback matches it; the account is student. Errors and pending state are visible. | `ManagedAuthForm`; live managed check pending credentials |
| AUTH-02 | As a user, I want to sign in/out so my work stays protected. | Valid session survives reload; sign-out denies protected API access; legacy cookies alone confer no managed identity. | `auth-session.test.ts`; `verify-managed-auth.ts` (live run pending) |
| ROLE-01 | As an institution, I want teacher access controlled on the server. | Registration cannot choose teacher; only an exact server-authorized subject can create a classroom. | `auth-policy.ts`; access-rule tests |
| CLASS-01 | As a student, I want to join my teacher's classroom. | A valid invitation code joins as student; an invalid code returns 404; repeats do not create duplicate memberships. | `/api/classrooms/join` |
| ASSIGN-01 | As a teacher, I want to create an assignment so students can contribute. | Only a classroom teacher may create/edit/publish; one criterion is created; other classrooms are inaccessible. | Assignment routes and dashboard; historical walking-skeleton E2E |
| GROUP-01 | As a student, I want to create/select my group for an assignment. | An existing draft assignment is required; group selection is assignment-scoped; one selection per student; duplicate names conflict. | Group service; real Postgres verification; `assignment-groups.spec.ts` |
| ANSWER-01 | As a teacher, I want to add group answers for comparison. | A teacher can add a named answer, description and optional HTTPS link without joining a student group. | `AssignmentGroups`; group rules/service |
| PUBLISH-01 | As a teacher, I want to start voting when groups are ready. | Feasibility must pass; pairs are allocated atomically; simultaneous publishes cannot duplicate pairs; enrollment then closes. | Assignment transaction; real Postgres concurrency verification |
| VOTE-01 | As a student, I want to compare other groups fairly. | Only my assigned pairs may be saved/submitted; neither side is my group; deadlines are enforced; saved answers restore. | Voting rules; real Postgres and group workflow E2E |
| RESULT-01 | As a teacher, I want private voting results. | Only teachers in that classroom receive score results. Students and outsiders receive 404 from result APIs. Students may see only their own completion counts. | `results-access.test.ts`; group workflow E2E |

## Decisions and edge cases

- Accepted: exact managed subject mapping, verified-only roster linking, no
  self-votes, cross-assignment group rejection, deadline lock, concurrent publish
  protection, and sanitized failure responses.
- Rejected: public teacher self-selection and student-visible score/rank results;
  both conflict with the requested access model.
- Deferred: multi-criteria grading, LMS integrations, group invitations/approval,
  post-publication group edits, and Google OAuth configuration. Email/password
  managed Auth is the requested initial flow.
- Pairwise voting excludes both compared groups' members. At least three populated
  groups are normally needed; the existing feasibility engine reports insufficient
  coverage rather than inventing voters or allowing self-votes.

## Definition of done

Relevant unit and browser tests pass; changed routes are exercised in development;
production build and OpenAPI validation pass; migrations and documentation match.
Managed Auth additionally requires real provisioned-branch verification. Human
review, remote CI evidence, staging deployment, and production release remain
separate completion requirements and must not be fabricated.
