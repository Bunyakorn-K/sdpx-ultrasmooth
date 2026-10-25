# AssignmentService.execute

Assignments use their internal resource UUID. The service loads the aggregate,
projects the classroom roster for drafts, checks access, applies domain rules,
and persists with optimistic locking. Conflicts reload state and re-evaluate
invariants before retrying.

Student access comes from Classroom CSV membership. Resource UUIDs are navigation
identifiers, not enrollment credentials. Ownership and membership checks remain
in the feature service.

Historical refactor evidence is retained in `docs/evidence/refactoring.json`;
its retired enrollment behavior is no longer part of the application.
See `docs/lab-status.md` for current verification.
