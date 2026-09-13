# Unit: Pairing Engine

## Purpose
Generates balanced pairwise comparison schedules and validates forced-choice student evaluation submissions.

## Responsibilities
- Generate balanced comparison pairs for students within assigned groups.
- Enforce the 6-point forced-choice scale (choices 1 to 6, with no neutral option).
- Prevent duplicate evaluations for the same pair by the same evaluator.
- Detect circular triad inconsistencies across reviewer decisions.

## NOT Responsible For
- Calculating final student grades or course marks.
- Managing user login sessions or OAuth tokens.
- Rendering evaluation interface components.

## Dependencies
- Depends on: Classroom Member and Group models.
- Used by: Student Evaluation Workspace, Progress Tracker.

## Key Business Rules
- Choice must be an integer between 1 and 6 inclusive (no 0 or neutral choice allowed).
- Evaluator cannot evaluate a pair containing themselves (self-evaluation guard).
- Same pair comparison cannot be submitted twice by the same student (conflict 409).
- Submissions after assignment due date must be rejected.

## Key Stories
- [Bunyakorn-K/sdpx-ultrasmooth#9 (User Story 03)](https://github.com/Bunyakorn-K/sdpx-ultrasmooth/issues/9)
- [Bunyakorn-K/sdpx-ultrasmooth#20 (User Story 08)](https://github.com/Bunyakorn-K/sdpx-ultrasmooth/issues/20)

## Bolt Type
[x] DDD Construction — domain logic ซับซ้อน
[ ] Simple Construction — ถ้าเป็น UI, integration, utility
