# Peerly

ระบบประเมินผลงานระหว่างกลุ่มสำหรับครูและนักเรียน ใช้ Next.js App Router, TypeScript, MUI และ Neon PostgreSQL หน้าแรกอ้างอิง `public/design.jpg` และใช้ธีมเดียวกันทั้งระบบ

- ครูสร้าง assignment โดยตรง พร้อมรหัส 6 หลัก, deadline, กลุ่ม และคำถาม
- นักเรียนเข้าด้วยรหัส สร้าง/เข้าร่วมกลุ่ม แล้วให้คะแนนกลุ่มอื่น 1–5 ทุกคำถาม
- ป้องกันโหวตตนเอง/ซ้ำ/หลัง deadline และตรวจสิทธิ์ฝั่ง server
- ครูเริ่ม/หยุดโหวต สรุปผล และนำเข้า/ส่งออก Excel

## เริ่มด้วย Docker

```sh
docker compose up --build
```

เปิด http://localhost:3000 PostgreSQL development จะเริ่มและสร้าง schema ให้อัตโนมัติ ถ้ามี server ใช้พอร์ตนี้อยู่แล้ว ให้ใช้ `APP_PORT=3301 docker compose up --build` ค่าบัญชีฐานข้อมูลใน Compose เป็นตัวอย่างสำหรับ local แบบทิ้งได้เท่านั้น

## เริ่มด้วย Neon

ใช้ Node.js 24:

```sh
npm ci
cp .env.example .env.local
```

ใส่ connection string ใน `DATABASE_URL` ภายใน `.env.local` แล้วรัน:

```sh
npm run db:init
npm run dev
```

`DATABASE_DRIVER=neon` เป็นค่าเริ่มต้นสำหรับ production ส่วน `postgres` ใช้ TCP กับ Docker/CI โดยตรง `.env.local` ห้าม commit

Login/Register ใช้ scrypt และ session ใน PostgreSQL ผ่าน cookie แบบ HttpOnly/SameSite ยังไม่ได้เชื่อมบริการ Neon Auth โดยตรง

หากยังไม่มีฐานข้อมูล กด **ลองใช้งานตัวอย่าง**: ข้อมูลแยกใน localStorage และตัวตน demo อยู่ใน sessionStorage สลับมุมครู/นักเรียนและ refresh หน้ารายละเอียดได้

## App Router และ Feature Structure

ไฟล์ route พิเศษอยู่ใน `app/` ตาม Next.js โดยเป็นตัวเชื่อมขนาดเล็กไปยัง screens ของแต่ละ feature:

| URL | Framework adapter | Feature |
| --- | --- | --- |
| `/` | `app/page.tsx` | landing |
| `/login` | `app/login/page.tsx` | auth |
| `/register` | `app/register/page.tsx` | auth |
| `/assignments` | `app/(workspace)/assignments/page.tsx` | assignments |
| `/assignments/[id]` | `app/(workspace)/assignments/[id]/page.tsx` | assignments |
| `/results` | `app/(workspace)/results/page.tsx` | assignments |

`app/api/**/route.ts` เป็น HTTP adapters; business rules อยู่ใน `features/assignments/domain`, service/repository อยู่ใน `server`, UI อยู่ใน `components/screens`, state/integration อยู่ใน `hooks/services` และธีมกลางอยู่ใน `shared/theme` รายละเอียดใน [architecture](docs/architecture.md) และ [ADR](docs/adr/ADR-001-feature-based-architecture.md)

API contract: [docs/openapi.yaml](docs/openapi.yaml) ใช้ cookie authentication และ canonical routes สำหรับ auth/assignment/group/question/voting โดยมี compatibility adapter สำหรับ client เดิม

## กติกาการประเมิน

ก่อนเริ่มโหวต นักเรียนเข้าร่วมงานและเลือกได้หนึ่งกลุ่ม ครูเปิดโหวตได้เมื่อมีคำถามและอย่างน้อยสองกลุ่มที่มีสมาชิก ทุกคนในกลุ่มประเมินกลุ่มอื่นได้ครั้งเดียวต่อกลุ่ม ทุกคำถามต้องเป็นจำนวนเต็ม 1–5 เมื่อถึง deadline server ปฏิเสธคะแนนใหม่ ครูกดหยุดเพื่อปิดงานและเผยแพร่ผล

คะแนนรวมเป็นผลรวมทุกคำตอบ คะแนนเฉลี่ยคือผลรวม ÷ จำนวนคำตอบรายข้อ (เต็ม 5) ส่งคะแนนพร้อมกันจะตรวจ version และตรวจซ้ำจากข้อมูลล่าสุดเพื่อป้องกันคะแนนซ้ำ/ข้อมูลทับกัน หน้าจอดึงสถานะ server ทุก 10 วินาที

## Excel

นำเข้า `.xlsx` ไม่เกิน 5 MB จากแผ่นงานแรก คอลัมน์ A หนึ่งคำถามต่อแถว สูงสุด 100 ข้อ ข้อละ 1,000 ตัวอักษร ข้ามหัวตาราง `คำถาม`/`question`/`questions` ให้อัตโนมัติ ต้องกดบันทึกหลัง preview และแก้ไขได้เฉพาะก่อนโหวต

ส่งออกมีแผ่นงาน **สรุปคะแนน** และ **คำตอบ** รวมจำนวนผู้ประเมิน คะแนนรวม/เฉลี่ย คำตอบรายข้อ และเวลาส่ง

## ตรวจสอบ

```sh
npm test
npm run test:coverage
npm run lint
npm run typecheck
npm run spec:lint
npm run build
```

Browser E2E:

```sh
npx playwright install chromium
npm run test:e2e
npm run test:e2e:repeat
```

Playwright เปิด server ที่พอร์ต 3100 และ `.next-e2e` โดยไม่หยุด server เดิม ตั้ง `BASE_URL` เมื่อจะใช้ server ที่รันอยู่แล้ว ถ้าไม่มี test database จะข้ามเฉพาะ database-backed cases; Docker profile ด้านล่างรันกับฐานข้อมูลจริงครบ

```sh
docker compose -f compose.test.yaml up unit --build --abort-on-container-exit --exit-code-from unit
docker compose -f compose.test.yaml --profile e2e up e2e --build --abort-on-container-exit --exit-code-from e2e
docker compose -f compose.test.yaml down -v
```

Test seed/cleanup ต้องมี opt-in, token และฐานข้อมูล `*_test` และถูกปิดใน production เสมอ Production image ใช้ non-root user และ `/api/health` health check

## เอกสาร Lab

ดู [Feature Compare](docs/labs/feature-compare.md) สำหรับตารางเทียบฟีเจอร์และข้อกำหนด WS01–WS08 กับไฟล์ที่ทำจริง รวมสถานะสิ่งที่ยังขาดและฟีเจอร์ใหม่ที่พักการทดสอบไว้

เริ่มที่ [สถานะ WS01–WS08](docs/lab-status.md) เพื่อดูสิ่งที่ทำ/ตรวจแล้วและสิ่งที่รอ GitHub/staging จริง ต่อด้วย [TEST_PLAN](TEST_PLAN.md), [backlog](docs/backlog.md), [setup](docs/setup-steps.md), [security](docs/security-pre-check.md), [performance](docs/performance-report.md) และ [GitHub setup](docs/github-setup.md)

ผลทดสอบในเครื่องไม่ได้หมายความว่า remote CI, branch protection, team review หรือ deployment ผ่านแล้ว หลักฐานและข้อจำกัดบันทึกตามจริงในเอกสารสถานะ
