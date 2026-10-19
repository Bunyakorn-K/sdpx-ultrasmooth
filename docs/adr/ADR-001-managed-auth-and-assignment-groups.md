# ADR-001: Managed identity and assignment-scoped group enrollment

## Status

Accepted for implementation by the project owner on 2026-10-19. Managed service
provisioning and live identity verification are pending account authentication.

## Context

The owner requested Neon managed Better Auth, two roles (teacher/student),
assignment-bound group creation, voting on other groups, and teacher-only results.
The existing application used an unsigned user-ID cookie, classroom-wide groups,
and public-to-members score reports. Earlier Supabase hosting guidance predates
the explicit Neon request. Existing Drizzle and Postgres drivers are retained.

## Decision

Use Neon's managed Better Auth SDK and same-origin Next.js proxy. Bind application
users to unique managed subjects; only verified emails may claim imported roster
accounts. Assign teacher eligibility from server-configured subject IDs, with
classroom memberships enforcing resource ownership. Registration defaults to student.

Keep the existing database `INSTRUCTOR`/`STUDENT` enum for compatibility; display
teacher/student in the product. Add assignment-scoped groups and one enrollment
per assignment/user. Serialize enrollment and publication on the assignment row.
Keep imported legacy classroom groups as a compatibility path when an assignment
has no scoped groups. Results are teacher-only; students may read completion counts.

## Alternatives considered

1. Keep the raw user-ID cookie: rejected because it does not authenticate identity.
2. Self-managed Better Auth on Vercel: viable, but the owner explicitly chose
   managed Better Auth; no unsupported managed plugin is currently required.
3. Let registration select teacher: rejected because it grants privileged access
   to anyone. An institution-controlled subject list is sufficient for this scope.
4. Reuse only classroom-wide groups: rejected because assignments must have
   independent enrollment and submissions.
5. Rename existing role enums immediately: deferred; presentation mapping avoids
   an unnecessary breaking data migration.

## Consequences

Positive: managed session verification, isolated assignment membership, protected
results, preserved ORM/driver, and compatible legacy regression tests.

Trade-offs: managed Auth requires an authenticated Neon project, AWS availability,
runtime secrets, and production email/domain setup. Teacher onboarding needs a
server configuration change. Post-publication enrollment changes are intentionally
blocked. Historical fixture auth is not evidence of managed Auth working.

## Revisit when

Teacher onboarding requires delegation, group membership needs approvals, or the
product needs a Better Auth plugin unsupported by the managed service.

## AI-DLC note

AI proposed exact subject-based identity binding, server-controlled teacher access,
and assignment-row serialization. The owner selected two roles, Neon managed Auth,
teacher-only results, and the supplied visual reference, then authorized execution.
No production readiness, human review, or remote pipeline result is inferred.
