# Unit: Assignment groups and voting

## Purpose

Allow students to form/select groups for an existing assignment, submit group
answers, and compare other groups while keeping results teacher-only.

## Responsibilities

Assignment-scoped group records, one selection per user/assignment, pre-publication
enrollment, teacher-created answers, and eligibility checks at the vote boundary.

## Not responsible for

Managed identity, teacher onboarding, LMS synchronization or multi-criteria grading.

## Dependencies

Classroom membership, assignment state/deadline, Drizzle migrations, existing
max-flow pairing engine and quality-index/scoring services.

## Key business rules

- Groups cannot be created without an accessible existing assignment.
- Group IDs cannot cross assignment boundaries.
- Enrollment and publication serialize on the same assignment row.
- Published/expired assignments reject group edits and late votes.
- Neither compared group can be the evaluator's own group.
- Results require classroom teacher membership; students get completion counts only.

## Key stories

GROUP-01, ANSWER-01, PUBLISH-01, VOTE-01, RESULT-01 in `docs/backlog.md`.

## Bolt type

Schema migration, transactional domain services, server authorization and browser workflow.
