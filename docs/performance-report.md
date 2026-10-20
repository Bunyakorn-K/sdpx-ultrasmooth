# Performance Report — WS07

## Setup

- Date: 2026-10-20
- Target: **local non-root production Docker runtime, port 3200**, using disposable PostgreSQL 17 over TCP
- This is not a staging/Neon benchmark; network latency, cold starts, tenancy and connection behavior differ.
- k6 2.3.0; ramp to 5 VUs in 30 seconds, up to 10 for 60 seconds, ramp down for 30 seconds; real login/list/detail/create journey with 1/1/2-second think time
- Dedicated generated teacher account in the isolated test database; cleanup removes only that run's data

## Hypothesis vs Actual

No pre-run hypothesis was recorded for the first baseline; no retrospective prediction is claimed. That first run completed 507 requests / 168 iterations with 0% failed requests and overall p95 ≈14.98 ms. Raw evidence is preserved in `performance/baseline-first.json`.

Follow-up hypothesis recorded before the second run: listing full assignment aggregates may cost more than reading a single assignment as records accumulate. The next run records per-endpoint latency explicitly. This is a hypothesis about local payload/query work, not proof of a database bottleneck.

## Results

The final measured table is generated below after the run; raw source is `performance/baseline.json`.

| Endpoint | p50 | p95 |
| --- | --- | --- |
| GET /api/assignments | 10.07 ms | 16.09 ms |
| GET /api/assignments/:id | 9.43 ms | 12.18 ms |
| POST /api/assignments | 8.67 ms | 13.59 ms |
| All requests | 9.25 ms | 15.18 ms |

507 requests, 168 completed iterations, failed-request rate 0.00%. All configured thresholds passed (exit 0). Runtime including startup/teardown is recorded in the evidence JSON; the load profile itself is 120 seconds.


## Threshold Fidelity

A separate 10-second run used deliberately impossible 1 ms p95 thresholds. k6 returned exit code 99, proving the gate can fail. See `performance/gate-probe.json` and `docs/evidence/performance-gate.json`. This was a local proof; no failing CI push is claimed.

## Bottleneck and Evidence Limits

The local baseline does not demonstrate an SLO breach. Structured logs split route latency from browser/network timing, but there are no database-span timings yet. Do not claim that SQL, Neon or serialization is the dominant bottleneck from route totals alone.

## AI Analysis

| Candidate                                                        | Evidence / current decision                                             | Measurement to confirm or rule out                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Full aggregate listing and serialization grow with ballot volume | Plausible, deferred; list returns aggregate JSONB                       | Record response bytes and list p95 at 100/1,000 assignments or large ballot counts |
| JSONB write contention increases voting latency                  | Plausible at larger concurrency, not established by teacher-create load | Log safe retry counters and measure concurrent voters on one assignment            |
| Neon network/cold-start latency dominates staging                | Cannot infer from local TCP baseline                                    | Repeat on dedicated staging with Neon and collect query/connection spans           |

No caching, schema rewrite or invented improvement percentage is proposed without that measurement. Production load testing is not authorized by this lab.
