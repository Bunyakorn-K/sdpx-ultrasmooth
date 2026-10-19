# Auth and enrollment before/after

## Before

`getCurrentUser()` parsed a raw `pe_uid` cookie and loaded that user. The report
endpoint returned group scores to any classroom member. Groups were classroom-wide.
Publication computed its inputs before beginning the write transaction.

## After

The managed session supplies an exact subject. The public user table binds that
subject uniquely, and imported email identities require verification before linking.
Teacher eligibility is server-owned and result routes enforce classroom ownership.
Assignment enrollment is separate from classroom roster membership, with one group
per user/assignment. Enrollment and publication lock the same assignment row.

## Validation

Existing test files were not changed. Added rules/session/result-boundary tests,
managed form tests and an assignment-group browser workflow. A real temporary
Postgres run checked assignment isolation, enrollment lock, duplicate names,
parallel publication, no-self-vote allocation, and identity-linking protection.

An intentional temporary removal of the self-group exclusion made the voting-rule
test fail. The source was restored in a `finally` block, and the full unit suite
passed afterward. No test assertion was weakened or deleted.

The initial three-repeat browser run exposed pre-hydration form submissions.
Adding a shared hydration-readiness hook fixed the application; all 18 repeated
browser cases then passed with the original tests intact. Managed backend and
email delivery still require separate live verification.
