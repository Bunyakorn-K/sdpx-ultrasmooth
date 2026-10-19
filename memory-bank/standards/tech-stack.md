# Tech Stack

## Decision Summary

ทีม: [
67015026 ฉัตรนรินทร บุญแสง
67015052 ธนพนธ์ ภูพานทอง
67015067 นนทพันธ์ อินทวงศ์
67015080 บุณยกร เกตุแก้ว
67015193 สิรภพ แสงสุข
]
Domain: PairEval (ระบบประเมินผลนักศึกษาแบบ Pairwise Comparison)
Date: 21 July 2026

## Frontend

- Framework: Next.js
- Language: TypeScript
- Styling: Tailwind CSS
- Rationale: ต้องการความรวดเร็วในการพัฒนา จบหน้าบ้านและหลังบ้านในโปรเจกต์เดียว และ AI เขียนโค้ด Stack นี้ได้แม่นยำมาก

## Backend

- Framework: Next.js API Routes (App Router)
- Language: TypeScript
- Rationale: ลดความซับซ้อนของการเชื่อมต่อ API ไม่ต้องตั้งค่า Server แยก และหมดปัญหาเรื่อง CORS

## Database

- Lakebase Postgres through Neon, using the existing Drizzle ORM and postgres driver.
- Owner-requested change on 2026-10-19 supersedes the earlier Supabase-hosting plan.
- Managed Better Auth via @neondatabase/auth; email/password initially. Service provisioning and live signup proof still require Neon sign-in.
- Secrets are injected at runtime only. No managed credentials are stored in the repository.

## Deployment

- Platform: Vercel
- Staging URL: https://sdpx-ultrasmooth-s1ux.vercel.app/
- Commit-to-live time: 1 นาที 45 วินาที (วัดเมื่อ WS-01)

## AI Tools

- Code generation: GitHub Copilot / Claude
- Review policy: ทุก AI-generated code ต้องอ่านและอธิบายได้ก่อน commit
