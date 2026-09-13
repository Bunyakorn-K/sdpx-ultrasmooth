# Setup Steps & Environment Loop (WS-05)

## Before (WS-05)
6 ขั้นตอน ~25 นาที:
1. Clone repository จาก GitHub
2. ติดตั้ง Node.js v20+ และ Bun runtime ให้ตรงเวอร์ชัน
3. ติดตั้งโปรเจกต์ dependencies (`bun install --frozen-lockfile`)
4. สร้างและตั้งค่าไฟล์ `.env.local`
5. ติดตั้งและเริ่มทำงาน PostgreSQL ในเครื่อง พร้อมสร้าง database
6. รันเซิร์ฟเวอร์ด้วย `bun dev`

## After (WS-05)
1. `docker compose up`
→ **1 ขั้นตอน** ~3 นาที (ครั้งแรกสำหรับการ build image) / ~15-20 วินาที (ครั้งถัดไป)

## Test Environment Commands
- รัน Unit tests ใน container:
  ```bash
  docker compose -f compose.test.yaml up unit --abort-on-container-exit --exit-code-from unit
  ```
- รัน E2E tests ใน container:
  ```bash
  docker compose -f compose.test.yaml --profile e2e up e2e --abort-on-container-exit --exit-code-from e2e
  ```
- ปิดและเคลียร์ ephemeral environment:
  ```bash
  docker compose -f compose.test.yaml down -v
  ```