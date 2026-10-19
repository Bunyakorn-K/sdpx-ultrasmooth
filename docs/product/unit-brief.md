# Unit Brief: Homepage

## Contract under test

PairEval's current observable contract is the landing page at `/`:

1. A visitor can identify PairEval as a university evaluation system.
2. The hero explains pairwise comparison with the heading `Fairer student evaluation through pairwise comparison`.
3. The navigation exposes `Home`, `How it works`, and `About` anchors.
4. The page exposes a `Sign in` entry point without claiming that authentication is implemented.

## Test layers

- Vitest + React Testing Library verifies rendered content and navigation structure without a network boundary.
- Playwright verifies that a real browser can load `/` through the local Next.js server and see the primary hero content.

## Non-goals

Authentication, authorization, persistence, pairwise comparison submission, ranking aggregation, reviewer dashboards, LMS integration, and mobile-native clients are not current homepage behavior and are not represented as implemented by these tests.

## Business-rule test matrix

| Rule | Test | Fidelity check |
| --- | --- | --- |
| The visitor can identify PairEval as a university evaluation system. | `homepage > shows PairEval homepage students` | Removed `University Evaluation System` from the page: the test fails because the required text is absent. |
| The hero communicates pairwise comparison. | `homepage > shows PairEval homepage students`; E2E smoke | Removed the hero heading: both unit and browser assertions fail. |
| Primary navigation exposes the three homepage anchors. | `homepage > provides homepage navigation entry point` | Removed any required anchor: the corresponding `href` assertion fails. |
| The visible sign-in entry point remains present without claiming auth behavior. | `homepage > provides homepage navigation entry point` | Removed the `Sign in` button: the role assertion fails. |

## Harness inventory

- Fake boundary: mocked `next/head`, `next/font/google`, and `animejs` isolate the homepage from browser-only and animation concerns.
- Fixtures: the `navItems` source data and rendered homepage provide stable input fixtures for navigation and content assertions.
- Factories: none are needed for this single-page construction unit; adding a fake repository would invent a persistence boundary that does not exist.

## Timing evidence

- `bun run test`: 2 tests passed; latest observed duration 1.02s.
- `bun run test:e2e --reporter=line`: 1 Chromium test passed; latest observed duration 1.9s.
- Unit suite is below the WS-03 ten-second budget.
