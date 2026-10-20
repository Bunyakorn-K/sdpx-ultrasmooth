# Intent: PairEval — Pairwise Evaluation System

## Intent Statement

ระบบประเมินผลงานและทักษะการทำงานของนักศึกษาแบบ **Pairwise Comparison (6-point forced choice)** เพื่อแก้ปัญหา Absolute scoring bias และ Free-rider problem ในงานกลุ่มระดับอุดมศึกษาอย่างเป็นธรรมและโปร่งใส

## Core Specification Reference

- **Authoritative PRD:** `docs/labs/pairwise_evaluation_prd.md` (PRD-PAIREVAL v2.0)
- **Supersedes:** ข้อมูล workshop/lab เก่า (1–5 rating rubric, no classroom, evaluate peers from other groups) ซึ่งผู้ใช้ระบุว่าเป็น feature ผิด ให้ยึดถือ PRD เป็นเกณฑ์หลัก

## Business Context & Problem Statement

1. **Absolute scoring bias:** ผู้ประเมินให้คะแนนงานชิ้นแรกและสุดท้ายด้วยมาตรฐานต่างกัน และ anchor กับงานก่อนหน้า → แก้ด้วยการเปรียบเทียบคู่แบบบังคับเลือก 6 ระดับ (6-point forced choice: ซ้ายดีกว่ามาก ถึง ขวาดีกว่ามาก ไม่มีตัวเลือกกลาง)
2. **Free-rider problem:** สมาชิกที่ไม่ทำงานได้คะแนนเท่ากับคนที่ทำเพราะคะแนนผูกกับกลุ่ม → แก้ด้วย Individual Evaluation ประเมินเพื่อนร่วมทีมภายในกลุ่มตนเอง
3. **Data-driven scoring:** คะแนนดิบคำนวณผ่าน Quality Index $q \in [0, 1]$ ถ่วงน้ำหนักตาม evaluator role (student vs instructor), Band Mapping ($floor \dots ceiling$), Weighted Criteria และ Participation Multiplier ($M$)

## Key System Architecture & Invariants

- **Classroom & Roster (FR-CLASS-01..07):** อาจารย์สร้าง classroom และนำเข้ารายชื่อผ่าน CSV แบบ Atomic (reject ทั้งไฟล์พร้อมรายงานแถวที่ผิดถ้ามี error เช่น email รูปแบบไม่ถูกต้อง หรือซ้ำซ้อน)
- **Feasibility Solver & Pairing Engine (§8):**
  - Group Evaluation: $k \le P - (N - 1)$, ผู้ประเมินไม่ได้รับคู่ที่มีกลุ่มตนเองอยู่ (FR-PAIR-02), balanced coverage diff $\le 1$
  - Individual Evaluation: สำหรับขนาดกลุ่ม $m \le 2$ ปิดการประเมิน (FR-PAIR-12), $m = 3$ complete enumeration พร้อม flag `LOW_CONFIDENCE` (FR-PAIR-13), $m \ge 4$ complete enumeration $C(m-1, 2)$ pairs (FR-PAIR-03)
- **Pure Function Scoring Engine (§9, AR-01):**
  - Choice points: 1 (1.0 vs 0.0), 2 (0.8 vs 0.2), 3 (0.6 vs 0.4), 4 (0.4 vs 0.6), 5 (0.2 vs 0.8), 6 (0.0 vs 1.0)
  - Random display position (FR-PAIR-08, D8)
  - Participation penalty แยกจาก component score (FR-SCORE-11, D5)
- **Quality & Integrity Signals (§10):**
  - QS-01: Low coverage (< 3)
  - QS-02: Straight-lining (> 80%)
  - QS-03: Position bias (> 80%)
  - QS-04: Intransitivity (> 20% violated triples)
  - QS-05: Speed run (< 3s average time per task)
- **Reports & Export (§7.7, §7.8):**
  - 4-Sheet XLSX Export: `Group Summary`, `Individual Summary`, `Pair Coverage`, `Metadata`
  - Filename format: `{classroom_slug}_{assignment_slug}_{report}_{YYYYMMDD-HHmm}.xlsx`

## Technology Conventions

- Next.js App Router + TypeScript strict
- MUI Design System matching `public/design.jpg` and `shared/theme/theme.ts`
- Feature-based separation (`features/pairwise`, `features/classroom`, `features/auth`, `features/assignments`)
