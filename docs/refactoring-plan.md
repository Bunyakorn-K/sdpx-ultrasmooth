# Refactoring and security review — 2026-10-19

| Priority | Location | Finding | Action |
| --- | --- | --- | --- |
| High | `src/lib/auth.ts`, legacy sign-in route | Unsigned user-ID cookie accepted as identity | Managed SDK session; fixture cookie only under explicit non-production opt-in |
| High | `my-report` API / report page | Students could read score results | Teacher-only result API; student page returns completion counts without scores |
| High | Assignment publication and enrollment | Concurrent group changes or duplicate publish could break pairing | Serialize both operations on the assignment row; real DB concurrency verification |
| High | Identity import/linking | Email alone could attach an existing privileged user | Unique subject binding; verified-only roster linking; reject subject replacement |
| Medium | Group/answer storage | Classroom-wide groups reused submissions between assignments | Assignment scope and enrollment table, while retaining explicit legacy compatibility |
| Medium | Controlled forms | Input could be lost before hydration under concurrent browser runs | Disable input until React has attached handlers; repeated unchanged E2E suite |
| Medium | Group Route Handlers / logging | Missing structured correlation and safe failure handling | Shared typed wrapper used by GET and POST, route template and timings only |
| Medium | Evaluation workspace | A late autosave may race with submission | Serialize client writes; disable editing submitted pairs. A cross-tab immutability policy remains a separate decision |
| Low | Database role naming | `INSTRUCTOR` differs from requested product label | Map to teacher in presentation; keep stable database enum |

## AI suggestions vs. decisions

- Accepted: reuse Drizzle/driver/pairing engine; add exact subject identity;
  keep server authorization separate from navigation; lock assignment publication.
- Rejected: public teacher self-selection, a new admin role, parallel Supabase
  sessions, or enabling Data API just to support login.
- Deferred: generic repositories, wholesale router migration, multi-criteria
  scoring and production deployment. They do not solve the requested change.

## Business context that changes the decision

Only teachers see outcomes. Students still need their own completion status, so
the old report URL now provides progress without exposing a vote result. Existing
roster-imported groups must keep working during the assignment-scope transition.
