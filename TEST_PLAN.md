# Test Plan: PairEval Homepage

## Observable rules

| Rule | Test | Fidelity check |
| --- | --- | --- |
| Visitors identify PairEval as a university evaluation system. | `src/features/home/index.test.tsx` homepage content test | Removing `University Evaluation System` makes the required-text assertion fail. |
| The hero communicates pairwise comparison. | Homepage content unit test and `tests/e2e/homepage.spec.ts` smoke test | Removing the hero heading makes both assertions fail. |
| Primary navigation exposes Home, How it works, and About anchors. | Homepage navigation unit test | Removing any required anchor makes its `href` assertion fail. |
| A visible Sign in entry point exists without claiming authentication is implemented. | Homepage navigation unit test | Removing the button makes the role assertion fail. |

## Harness

- Boundary mocks: `next/head`, `next/font/google`, and `animejs` isolate browser-only and animation concerns.
- Fixtures: the existing homepage navigation data and rendered homepage are stable fixtures for content and anchor assertions.
- Factory/fake decision: this story has no repository or persistence boundary. A fake repository would invent unimplemented behavior, so no fake repository is included.

## Fidelity evidence

- Unit tests run before and after production changes and assert user-visible semantics, not implementation details.
- The browser smoke test loads `/` through Next.js and checks the primary hero content.
- [INFERENCE] Deleting each asserted contract element would make the corresponding test fail; the assertions directly target those elements.

## Verification results

- `bun run test`: 5 tests passed; latest observed duration 1.3s on 2026-08-24 (homepage tests plus the new `tests/unit` sanity and test-data store tests).
- `bun run test:e2e --reporter=line`: 1 Chromium test passed; latest observed duration 1.9s on 2026-08-11.
- `bunx tsc --noEmit`: passed with no diagnostics; re-passed on 2026-08-24 after the seed/cleanup additions.
- `bun run build`: compiled successfully; re-run on 2026-08-24 with the new API routes registered as dynamic.
- `bun run lint:api`: OpenAPI document validated with Redocly CLI.
- Unit suite stayed below the WS-03 ten-second budget.
