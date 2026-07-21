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

- PostgreSQL (via Supabase)
- Rationale: จัดการง่าย เข้ากันได้ดีกับ Next.js และมีระบบจัดการ Google OAuth ที่สอดคล้องกับ Requirement (FR-AUTH-01) ของ PairEval

## Deployment

- Platform: Vercel
- Staging URL: https://sdpx-ultrasmooth-s1ux.vercel.app/

## AI Tools

- Code generation: GitHub Copilot / Claude
- Review policy: ทุก AI-generated code ต้องอ่านและอธิบายได้ก่อน commit
