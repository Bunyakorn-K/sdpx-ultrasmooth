# Test Plan: PairEval Test Suite

## Functions ที่ต้อง Test (WS-03 Business Rules)

### 1. ScoringService.calculateScore(qualityIndex, floor, ceiling)
- q = 0.0 → score = floor (e.g. 60.0)
- q = 1.0 → score = ceiling (e.g. 100.0)
- 0.0 < q < 1.0 → score = floor + q * (ceiling - floor)
- floor >= ceiling หรืออยู่นอกช่วง [0, 100] → InvalidScoreBoundsError
- qualityIndex < 0.0 หรือ > 1.0 → InvalidQualityIndexError

### 2. ScoringService.calculateScoresForAssignment(assignmentId, studentIds, floor, ceiling)
- คำนวณอัตราการชนะ (Quality Index) จากประวัติผลการเปรียบเทียบคู่ใน FakeComparisonRepository
- แปลง Quality Index เป็นคะแนนจริงตามเกณฑ์ band mapping

### 3. Homepage Observable Rules
- Visitors identify PairEval as a university evaluation system
- Hero communicates pairwise comparison
- Primary navigation exposes Home, How it works, About anchors
- Visible Sign in entry point exists without claiming authentication

## Harness Inventory

- **Fake Repository:** 	ests/fakes/fake-comparison-repo.ts (FakeComparisonRepository implements ComparisonRepository) จำลอง database layer ใน RAM
- **Factories:** 	ests/factories.ts (makeComparison, makeUser, makeAssignment) สำหรับสร้างข้อมูล fixture ที่ปรับ override ได้
- **Fixtures:** src/lib/test-data.ts in-memory test data store พร้อม endpoint /api/test/seed และ /api/test/cleanup
- **Boundary Mocks:** 
ext/head, 
ext/font/google, nimejs

## Fidelity Check (WS-03)

| ลบกฎ (Mutation) | Test ที่แดง | ผลการทดสอบ |
|---|---|---|
| ลบเงื่อนไข if (floor >= ceiling) throw new InvalidScoreBoundsError(); | ScoringService - Business Rules > throws InvalidScoreBoundsError when floor >= ceiling | ✅ Harness ปกป้องกฎนี้ (Red เมื่อลบกฎ) |
| ลบการคำนวณ score = floor + qualityIndex * (ceiling - floor) | ScoringService - Business Rules > maps Quality Index (q = 0.0) exactly to configured score floor | ✅ Harness ปกป้องกฎนี้ (Red เมื่อลบกฎ) |
| ลบ heading Fairer student evaluation through pairwise comparison | homepage > shows PairEval homepage students | ✅ Harness ปกป้องกฎนี้ |

## Verification Results

- un run test: 11 tests passed across 4 test files (duration ~2.4s, well below the 10s budget).
- un run test:coverage: generated HTML and JSON coverage reports in docs/coverage/.
- un run lint: passed type check and Redocly OpenAPI validation.
- un run build: Next.js production build succeeded.