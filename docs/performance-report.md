# Performance Report — WS-07

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
