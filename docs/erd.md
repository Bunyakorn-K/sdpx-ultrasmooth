# Entity Relationship Diagram (M1)

Reflects the actual Drizzle schema in `src/db/schema.ts`. Trimmed from the
full PRD §11 data model to what M1 needs — every omission (multi-criteria
weighting beyond one auto-created criterion, `computed_score`/`score_override`/
`audit_event`/`notification`/`appeal` tables, individual-side pairing) is an
additive change for M2/M3, not a redesign.

No Docker on this dev machine, so there's no ephemeral `compose.test.yaml`
Postgres instance wired up for CI/E2E yet — local dev and the one E2E spec
(`tests/e2e/specs/m1-walking-skeleton.spec.ts`) both run against a native
Postgres install with the same credentials `compose.yaml` already documents.

```mermaid
erDiagram
    USER ||--o{ CLASSROOM_MEMBER : has
    CLASSROOM ||--o{ CLASSROOM_MEMBER : contains
    CLASSROOM ||--o{ GROUP_ENTITY : contains
    CLASSROOM ||--o{ ASSIGNMENT : contains
    GROUP_ENTITY ||--o{ CLASSROOM_MEMBER : groups
    ASSIGNMENT ||--o{ CRITERION : defines
    ASSIGNMENT ||--o{ PAIR_ASSIGNMENT : generates
    CRITERION ||--o{ PAIR_ASSIGNMENT : scopes
    PAIR_ASSIGNMENT ||--o{ COMPARISON : receives
    USER ||--o{ COMPARISON : submits

    USER {
        int id PK
        string email_normalized
        string email_raw
        string display_name
        string status "PENDING|ACTIVE"
    }
    CLASSROOM {
        int id PK
        string name
        string slug
    }
    CLASSROOM_MEMBER {
        int id PK
        int classroom_id FK
        int user_id FK
        string role "INSTRUCTOR|STUDENT"
        int group_id FK "nullable, students only"
    }
    GROUP_ENTITY {
        int id PK
        int classroom_id FK
        string name
        string artifact_url "nullable — per-group evaluation link"
        string description "nullable"
    }
    ASSIGNMENT {
        int id PK
        int classroom_id FK
        string name
        numeric group_max_score
        numeric score_floor_pct
        numeric score_ceiling_pct
        int target_coverage
        int max_workload
        bigint pairing_seed
        string status "DRAFT|PUBLISHED"
    }
    CRITERION {
        int id PK
        int assignment_id FK
        string name
        numeric weight_pct
    }
    PAIR_ASSIGNMENT {
        int id PK
        int assignment_id FK
        int criterion_id FK
        int item_a_id FK "group_entity.id"
        int item_b_id FK "group_entity.id"
        int evaluator_user_id FK
        int display_left_item_id
    }
    COMPARISON {
        int id PK
        int pair_assignment_id FK
        int evaluator_user_id FK
        int choice "1-6, nullable"
        string status "draft|saved|submitted"
    }
```

## Notable adaptations vs. the full PRD §11 model

- `artifact_url`/`description` live on `group_entity`, not on `assignment` —
  the Pairwise Evaluation wireframe needs a per-group "ดูผลงาน" link, and the
  PRD's data model doesn't have an obvious home for that.
- `assignment.score_floor_pct`/`score_ceiling_pct` are 0–100 (percentage
  scale), not the PRD's 0–1 fraction, to match the existing, already-tested
  `ScoringService.calculateScore`'s validation (`floor < 0 || ceiling > 100`).
- `comparison.status` stays lowercase (`draft|saved|submitted`) to match the
  pre-existing `Comparison` TypeScript interface and its tests, rather than
  the PRD's `DRAFT|SUBMITTED|EXCLUDED`.
