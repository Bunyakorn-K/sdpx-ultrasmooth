# Unit: Authentication

## Purpose

ระบุตัวผู้ใช้และบทบาทโดยไม่เปิดเผยรหัสผ่านหรือ session token

## Responsibilities

- Register/login/logout, password hashing, cookie/session lifecycle
- Persistent login attempt limit and role validation

## NOT Responsible For

- Assignment ownership, group membership, vote rules, UI navigation

## Dependencies

- Depends on: UserRepository, PostgreSQL session/rate-limit persistence, shared HTTP boundary
- Used by: API adapters and workspace auth hook

## Key Business Rules

- US01: valid teacher/student registration returns a user without password_hash
- US01: wrong credentials return 401; duplicate email returns 409
- US01: logout revokes the session; unauthenticated protected access returns 401
- SEC07: more than 10 authentication attempts for the same email in 15 minutes returns 429
- SEC06: test data endpoints never work in production

## Key Stories

`docs/backlog.md#us01`; remote issue URLs pending repository selection.

## Bolt Type

Simple Construction — auth integration and server boundary.
