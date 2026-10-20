# Refactoring: AssignmentService.execute

## Function

`features/assignments/server/assignment-service.ts` — `execute`.

## Before

```typescript
const record =
  input.action === "join"
    ? await this.repository.findByCode(String(input.code || ""))
    : await this.repository.findById(String(input.id || ""));
```

## Issues Found

The retry loop mixed identifying an assignment by join code or ID with applying a command and persisting a versioned update. The lookup choice is extracted without changing retry count, errors or authorization behavior.

## After

```typescript
const record = await this.findForCommand(input);

private findForCommand(input: Record<string, unknown>) {
    return input.action === "join"
      ? this.repository.findByCode(String(input.code || ""))
      : this.repository.findById(String(input.id || ""));
  }
```

## What AI Suggested vs What Was Implemented

- Implemented one lookup extraction so the retry loop reads as load → apply rules → compare-and-swap.
- Did not introduce a command bus, additional service layer or new repository pattern: repository interfaces already exist and the current problem does not justify those additions.
- This is an agent implementation decision within the user's Clean code request, not a claimed separate team review.

## Tests Result

- Before: 44 tests pass.
- After: 44 tests pass.
- Existing unit test SHA-256 hashes unchanged: true.
- Reverts due to red tests during this refactor: 0.
- Security tests and Excel tests were added in their own preparation work before this scoped behavior-preserving refactor.
- Machine evidence: `docs/evidence/refactoring.json`.
