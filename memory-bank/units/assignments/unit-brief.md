# Unit: Assignments and Voting

## Purpose

จัดการวงจร assignment → กลุ่ม → โหวต → สรุปคะแนน

## Responsibilities

- Generate unique six-digit join codes
- Membership, group creation/join, question validation, voting state transitions
- Prevent self/duplicate/late votes and lost updates
- Hide other ballots during voting and anonymize final student results

## NOT Responsible For

- Password/session management, MUI rendering, Excel file format parsing

## Dependencies

- Depends on: User value, AssignmentRepository interface, shared AppError
- Used by: HTTP adapters, demo client and workspace UI

## Key Business Rules

- Only a teacher can create an assignment; title and future deadline are required
- Students join a draft assignment and exactly one group
- Only owner can edit questions/start/stop; start needs questions and two populated groups
- Each score is integer 1–5; every question must have a score
- Each user votes once per other populated group before deadline while active
- Optimistic conflicts retry against latest state, rechecking duplicate votes
- Outsiders cannot read assignment detail

## Key Stories

US02–US10 in `docs/backlog.md`; GitHub issue links pending repository selection.

## Bolt Type

DDD Construction — assignment aggregate and voting invariants; no extra framework introduced.
