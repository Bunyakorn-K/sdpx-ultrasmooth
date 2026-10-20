# ADR-002: PostgreSQL Transports and Versioned Assignment Aggregates

## Status

Implemented; explicit architecture review of the aggregate trade-off remains pending. Neon/PostgreSQL itself is a user requirement.

## Date

2026-10-20

## Context

The initial implementation stores assignment membership, groups, questions and ballots as a JSONB aggregate with a version number. Neon HTTP cannot connect directly to the plain PostgreSQL service required by the Docker/CI labs.

## Decision

Retain Neon HTTP in production and use the `postgres` TCP driver for local/CI with the same parameterized SQL boundary. Configure JSONB serialization so pre-serialized JSON is not encoded twice. Keep atomic compare-and-swap updates and retry/revalidate against the latest version.

## Alternatives Considered

1. Depend on a remote Neon branch in every unit/E2E run — not selected; it adds remote secrets/network dependency to disposable Docker testing.
2. Pretend Neon HTTP can query a plain Docker PostgreSQL service — invalid transport assumption, rejected after checking the actual drivers.
3. Normalize every aggregate child into tables immediately — deferred; worthwhile at larger scale, but a larger migration than required to establish reliable current tests.

## Consequences

### Positive

- Reproducible real PostgreSQL tests without changing the production data engine.
- Concurrent duplicate ballot requests are verified to yield one persisted ballot with 201/409.

### Negative / Trade-offs

- Whole JSONB aggregates grow with ballots; list responses currently include aggregate payloads.
- One assignment is a contention boundary, even for votes on different groups.
- Logical membership/ballot uniqueness is enforced by policy plus version checks, not child-table foreign keys.
- Local TCP performance is not a substitute for measuring Neon/staging performance.

## Revisit When

Ballot volume, response size or conflict retry rate become measurable bottlenecks. Evaluate normalized ballots and lightweight list DTOs then.

## AI-DLC Note

This is a record of the implementation selected by the agent within the authorized lab work. It does not claim the user or a student team separately evaluated every database alternative.
