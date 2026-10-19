# Unit: Managed identity

## Purpose

Authenticate teacher/student users through Neon managed Better Auth and resolve
their application identity without trusting browser-controlled user IDs or roles.

## Responsibilities

- Email/password signup, sign-in, sign-out, verification-code UI and session readback.
- Same-origin SDK handler, scoped page proxy and server session checks.
- Unique managed subject mapping and verified-only linking of imported roster users.
- Server-configured teacher eligibility; new registrations default to student.

## Not responsible for

Classroom membership grants, scoring, group allocation, SMTP operations, or
assigning admin access (there is no admin role).

## Dependencies

Neon managed Auth, runtime environment, Drizzle public user table, Next.js Route
Handlers. Live provisioning and email delivery are not verified by mocked tests.

## Key business rules

An unsigned cookie or signup role cannot grant managed identity. Unverified email
cannot claim an existing account. Classroom role checks are required independently
of page redirects. Secrets and identity payloads must not be logged.

## Key stories

AUTH-01, AUTH-02 and ROLE-01 in `docs/backlog.md` (local drafts, not new Issues).

## Bolt type

Integration with explicit authorization and identity-linking regression tests.
