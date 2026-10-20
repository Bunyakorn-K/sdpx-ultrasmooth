# Physical Schema and Logical Aggregate

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : authenticates
    USERS ||--o{ ASSIGNMENTS : owns
    USERS {
        uuid id PK
        text name
        text email UK
        text password_hash
        text role
        timestamptz created_at
    }
    SESSIONS {
        text token_hash PK
        uuid user_id FK
        timestamptz expires_at
    }
    ASSIGNMENTS {
        uuid id PK
        uuid owner_id FK
        text code UK
        jsonb data
        integer version
    }
    AUTH_RATE_LIMITS {
        text bucket PK
        integer attempts
        timestamptz reset_at
    }
    E2E_TEST_RUNS {
        uuid run_id PK
        jsonb user_ids
    }
```

`auth_rate_limits.bucket` is a hash of the normalized email; raw email and credentials are never logged. `e2e_test_runs` exists only to identify disposable fixture data; guarded endpoints cannot operate on production.

The following are logical entities embedded inside `assignments.data`, not physical tables:

```mermaid
erDiagram
    ASSIGNMENT ||--o{ QUESTION : defines
    ASSIGNMENT ||--o{ GROUP : contains
    ASSIGNMENT ||--o{ MEMBERSHIP : has
    GROUP ||--o{ GROUP_MEMBER : includes
    USER ||--o{ MEMBERSHIP : joins
    USER ||--o{ GROUP_MEMBER : participates
    USER ||--o{ BALLOT : casts
    GROUP ||--o{ BALLOT : receives
    BALLOT ||--|{ SCORE : answers
    QUESTION ||--o{ SCORE : scored
    QUESTION { integer index PK }
    GROUP { uuid id PK }
    MEMBERSHIP { uuid user_id PK }
    GROUP_MEMBER { uuid user_id PK }
    BALLOT { uuid user_id PK uuid group_id PK datetime created_at }
    SCORE { integer question_index PK integer value }
```

The domain enforces one membership/group per user per assignment and uniqueness of `(user_id, group_id)` ballots under the aggregate version check. Question index is stable once voting opens. These logical constraints are not incorrectly claimed as relational foreign keys.
