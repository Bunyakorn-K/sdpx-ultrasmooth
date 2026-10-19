# Performance report — 2026-10-19

## Current local measurement

- Target: localhost Next.js development server, reached from Docker through
  `host.docker.internal`. This was not a staging or production load test.
- Final runtime: Next.js 16.4.2; managed Auth unconfigured and fixture auth disabled.
- Script: `performance/load-test.js`, public journey `/` -> `/sign-up` -> `/api/health`.
- Profile: 30s ramp to 5 VUs, 60s ramp to 10, 30s ramp down; one-second think time
  after each request. k6 used the official `grafana/k6` container image.
- Evidence: `performance/baseline-after-security.json`: 651 successful requests,
  217 completed iterations, 0 HTTP failures; median 27.89ms, p95 42.03ms.
- All configured thresholds passed: p95 <500ms, failure rate <1%, checks >99%.
- Earlier same-day baseline (`baseline.json`, before dependency upgrades, with
  concurrent local verification) recorded 606 requests, p95 200.48ms, 0 failures.
  The two runs are not a controlled causal comparison; do not attribute their
  difference to the security update alone.

## Hypothesis and limits

The public pages should stay below 500ms p95 under this small local load. That
aggregate threshold passed. The max response was about 2.68s, which is compatible
with cold compilation, but timing alone does not prove that cause. A warm/cold
split and request-correlated compiler timings would test that explanation.

No measured evidence establishes a database, network, or auth bottleneck. Public
GET requests do not exercise signup, authenticated assignments or vote writes.
A future authenticated staging journey needs a dedicated test identity, controlled
assignment data and secret-safe runtime session injection. Never substitute fast
401/403 responses for successful application operations in a performance claim.

## Structured logs

Group GET/POST routes use `withRequestLogging`: event, correlation ID, route
pattern, status and elapsed milliseconds. A thrown exception returns a generic
500 rather than logging request bodies or raw driver errors. Root and nested
password/token/email fields are redacted. No real user credentials were used in
this measurement.

## AI analysis

Accepted: measure before proposing a bottleneck, use realistic think time, and
separate public-page throughput from authenticated workflow performance.
Rejected: calling the previous 100%-failure API run a speed baseline or claiming
production performance from localhost. Further measurement: warm/cold request
correlation and successful authenticated voting on an isolated staging branch.

---

The following report is historical context and does not describe this version:
## Historical measurement — 2026-09-28

## Setup

- Target: Localhost (รออัปเดตเป็น Staging URL ตอนนำไปใช้จริง)
- Load profile: ramp 0→5→10 VUs, รวม 2 นาที
- วันที่ทดสอบ: 28 ก.ย. 2026

## Hypothesis vs Actual

| Hypothesis (ที่เดาไว้ก่อนวัด)                 | ผลจริง        | ถูก/ผิด |
| --------------------------------------------- | ------------- | ------- |
| `GET /api/classrooms` จะช้าที่สุด p95 > 300ms | p95 = 12.47ms | ผิด     |
| `POST /api/classrooms` จะช้า p95 > 300ms      | p95 = 11.05ms | ผิด     |

_(หมายเหตุ: ที่ผลจริงตอบกลับมาเร็วมาก เพราะตัว API ทำงานไม่สำเร็จและรีบ return error กลับมาทันที)_

## Results

| Endpoint             | p50 (med) | p95     | error rate |
| -------------------- | --------- | ------- | ---------- |
| GET /api/classrooms  | 8.43ms    | 12.47ms | 100%       |
| POST /api/classrooms | 8.56ms    | 11.05ms | 100%       |

## Threshold ที่ไม่ผ่าน

- `errors` และ `http_req_failed` ไม่ผ่าน (Rate พุ่งไปที่ 100%)
- **สาเหตุที่สงสัย:** ระบบ Authentication หรือ Database ในโปรเจกต์ยังพัฒนาไม่สมบูรณ์ ทำให้ Server ทำการปฏิเสธ Request ทั้งหมด (อาจเกิด 401 Unauthorized หรือ 500 Internal Server Error)

## Bottleneck ที่พบ

- ปัจจุบันยังไม่สามารถระบุ Bottleneck ด้าน "ความเร็ว" ได้ชัดเจนเนื่องจาก Request ทุกตัวถูกปฏิเสธตั้งแต่ต้นทาง (ทำให้เวลา p95 น้อยเพียง 11-12ms)
- คอขวดหลักตอนนี้คือ **ฟีเจอร์ Login และ Business Logic ที่ยังทำงานไม่ครบ Flow** หลักฐานคือ `http_req_failed = 100%` และ `checks_failed = 100%` ตลอดการทดสอบ

## สิ่งที่จะแก้ (ยังไม่แก้ในวันนี้)

1. พัฒนาระบบ Authentication และเชื่อมต่อ Database ให้สมบูรณ์ เพื่อให้ Load Test สามารถวิ่งเจาะทะลุลงไปถึงชั้น Database ได้ — คาดว่าจะทำให้เราสามารถวัดค่า p95 และหา Bottleneck ด้านความเร็วที่แท้จริงได้ใน Sprint ถัดไป

## AI Analysis

- **AI เสนอสาเหตุที่พัง:** 1) ขาดการตั้งค่า Cookie/Session ที่ถูกต้อง 2) Database ยังไม่ได้รัน Migration หรือไม่มีข้อมูล 3) โค้ดใน Controller ดักโยน Error ทิ้งไว้เนื่องจากยังพัฒนาไม่เสร็จ
- **เรารับ:** ข้อ 3 และ 1 เพราะโปรเจกต์ยังอยู่ระหว่างพัฒนา ฟีเจอร์ Auth จึงยังทำงานไม่ได้ตามปกติ
- **การวัดที่จะทำเพิ่มเพื่อยืนยัน:** เปิดดู Server Logs (bun dev) เพื่อตรวจสอบ Status Code และ Error Stack Trace ของ Request ที่ส่งไป
