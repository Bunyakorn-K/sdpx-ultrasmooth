# Unit: Scoring Engine

## Purpose
Calculates individual student baseline and final scores from pairwise comparison outcomes using the Quality Index and band-mapping formula.

## Responsibilities
- Compute win/loss quality indices from completed comparison matrices.
- Apply configured score floors and ceilings (e.g. 60% floor to 100% ceiling).
- Ensure scores remain strictly within [score_floor, score_ceiling].
- Handle edge cases when an item has zero wins or maximum wins.

## NOT Responsible For
- Authenticating students or instructors.
- Storing comparison records directly to the database.
- Presenting evaluation UI to users.

## Dependencies
- Depends on: Database schema / comparison repository.
- Used by: Instructor Dashboard, Export Service, Assignment Service.

## Key Business Rules
- Quality Index (q = 0.0) must map exactly to configured score_floor.
- Quality Index (q = 1.0) must map exactly to configured score_ceiling.
- Intermediate Quality Index (0.0 < q < 1.0) scales linearly: `score = floor + q * (ceiling - floor)`.
- If score_floor >= score_ceiling, the engine must raise an InvalidScoreBoundsError.
- Missing evaluations default quality index to 0.0 for free-riders with participation penalties.

## Key Stories
- [Bunyakorn-K/sdpx-ultrasmooth#10 (User Story 04)](https://github.com/Bunyakorn-K/sdpx-ultrasmooth/issues/10)
- [Bunyakorn-K/sdpx-ultrasmooth#19 (User Story 07)](https://github.com/Bunyakorn-K/sdpx-ultrasmooth/issues/19)

## Bolt Type
[x] DDD Construction — domain logic ซับซ้อน (mathematical scoring model)
[ ] Simple Construction — ถ้าเป็น UI, integration, utility
