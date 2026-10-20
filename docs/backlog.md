# Product Backlog & Acceptance Criteria — PairEval

**Document ID:** BACKLOG-PAIREVAL  
**Authoritative Reference:** [PRD-PAIREVAL v2.0](file:///Users/whyzotee/Desktop/pair-eval/docs/labs/pairwise_evaluation_prd.md)  
**Status:** In Progress / Feature Alignment

> **Note on Scope Alignment:**  
> The previous 1–5 integer rubric, 6-digit code without classroom, and inter-group peer ratings were from deprecated workshop outlines.  
> Following the product owner's directive, all requirements are verified and strictly aligned with `pairwise_evaluation_prd.md`.

---

## Definition of Done (applies to every requirement)

- [ ] Implementation completed and strictly compliant with PRD-PAIREVAL v2.0
- [ ] Unit & domain property-based tests passing
- [ ] Accessible UI with ARIA standards and keyboard navigability
- [ ] OpenAPI contract, typecheck, lint, and build passing without errors
- [ ] Verification evidence recorded in `docs/lab-status.md`

---

## 1. Authentication & Authorization (FR-AUTH & FR-AUTHZ)

### FR-AUTH-03: Email Normalization & Matching
- **AC1:** Normalizes emails to lowercase, strips dots for gmail domains, and removes `+tag` suffixes.
- **Verify:** `tests/unit/roster-parser.test.ts` (PASSED).

### FR-AUTHZ-01 / FR-AUTHZ-02: Server-side Authorization & Scope
- **AC1:** Every API mutation checks authentication and role on server.
- **AC2:** Cross-classroom or unauthorized resource accesses return 404 (not 403 to prevent resource probing).
- **Verify:** `tests/unit/http-security.test.ts` (PASSED).

---

## 2. Classroom & Roster Management (FR-CLASS)

### FR-CLASS-01 / FR-CLASS-02 / FR-CLASS-03: CSV Import & Atomic Validation
- **AC1:** Instructor imports roster CSV: `email`, `group_name`, `student_id` (optional), `display_name` (optional).
- **AC2:** Atomic validation: Any invalid row rejects the entire file and reports the exact row number.
- **AC3:** Detects duplicate emails, invalid email formats, empty group names, and warns if group size < 2.
- **Verify:** `tests/unit/roster-parser.test.ts` (PASSED).

---

## 3. Assignment Lifecycle & Criteria (FR-ASSIGN)

### FR-ASSIGN-01 / FR-ASSIGN-02: Assignment & Weighted Criteria
- **AC1:** Assignment defines group and individual deadlines, `group_max_score`, `individual_max_score`, `score_floor` (default 0.60), `score_ceiling` (default 1.00), and `instructor_weight` (default 1.0).
- **AC2:** Criteria for each side (GROUP / INDIVIDUAL) must sum to 100% (±0.01) before publishing.
- **Verify:** `features/pairwise/domain/scoring-engine.ts`, `features/assignments/components/criteria-panel.tsx`.

---

## 4. Pairing Engine & Feasibility (FR-PAIR)

### FR-PAIR-01 / FR-PAIR-04 / FR-PAIR-05: Feasibility Solver
- **AC1:** Solves maximum achievable coverage $R$ and workload $k$ under invariants:
  - Constraint 1: $k \le P - (N - 1)$
  - Constraint 2: $k \le k_{\text{max}}$ (default 8)
  - Constraint 3: $R \le \min(S - |a| - |b|)$
- **AC2:** If target coverage is infeasible, automatically downsizes to max feasible $R$ and explains mathematical reason.
- **Verify:** `tests/unit/pairing-engine.test.ts` (§8.2 Feasibility Examples 1 & 2) (PASSED).

### FR-PAIR-02 / FR-PAIR-03 / FR-PAIR-06..09: Pairing Generation & Invariants
- **AC1 (FR-PAIR-02):** Group eval: evaluator never receives a pair containing their own group.
- **AC2 (FR-PAIR-03):** Individual eval: evaluator evaluates pairs of teammates within their own group (excluding themselves).
- **AC3 (FR-PAIR-06):** Balanced coverage: difference in coverage between any two pairs $\le 1$.
- **AC4 (FR-PAIR-08):** Random left/right swap display (`display_left_item_id`) stored deterministically per seed.
- **AC5 (FR-PAIR-12 / FR-PAIR-13):** Individual evaluation boundaries: $m \le 2$ disabled; $m = 3$ flagged `LOW_CONFIDENCE`; $m \ge 4$ complete enumeration $C(m-1, 2)$ pairs per evaluator.
- **Verify:** `tests/unit/pairing-engine.test.ts` (Property-Based Test INV-1 to INV-5) (PASSED).

---

## 5. Evaluation UI & 6-Point Forced Choice (FR-EVAL)

### FR-EVAL-03 / D1: 6-Point Forced Choice Comparison
- **AC1:** Eliminates neutral/middle options to avoid central tendency bias:
  - 1: ซ้ายดีกว่ามาก (1.0 vs 0.0)
  - 2: ซ้ายดีกว่า (0.8 vs 0.2)
  - 3: ซ้ายดีกว่าเล็กน้อย (0.6 vs 0.4)
  - 4: ขวาดีกว่าเล็กน้อย (0.4 vs 0.6)
  - 5: ขวาดีกว่า (0.2 vs 0.8)
  - 6: ขวาดีกว่ามาก (0.0 vs 1.0)
- **AC2:** Each radio choice has full accessible label and name.
- **Verify:** `features/pairwise/components/pairwise-card.tsx`, `features/pairwise/components/pairwise-dialog.tsx`.

---

## 6. Scoring Engine (FR-SCORE)

### FR-SCORE-01 / FR-SCORE-02 / FR-SCORE-03: Quality Index & Band Mapping
- **AC1:** Quality Index $q(i, c) = \frac{\sum w_e s_{i,e}}{\sum w_e} \in [0, 1]$.
- **AC2:** Instructor weight $w_e$ is treated as a float in the weighted mean (D6).
- **AC3:** Band Mapping: $\text{score\_ratio}(i, c) = \text{floor} + (\text{ceiling} - \text{floor}) \times q(i, c)$.
- **Verify:** `tests/unit/scoring-engine.test.ts` (Golden Test matching PRD §9.5 worked example) (PASSED).

### FR-SCORE-04 / FR-SCORE-11: Participation Multiplier Separated from Work Quality
- **AC1:** $M = \min(1.0, p / \text{completion\_threshold})$ where threshold default is 0.90.
- **AC2:** A member's non-participation reduces only their personal multiplier $M$, never the group's component score.
- **Verify:** `tests/unit/scoring-engine.test.ts` (PASSED).

---

## 7. Integrity & Quality Signals (QS / FR-QS)

### QS-01..05: Quality Signals Detection
- **AC1 (QS-01):** Flags items with comparisons $< 3$ as `Low coverage` / `LOW_CONFIDENCE`.
- **AC2 (QS-02):** Flags evaluators with $> 80\%$ straight-lining.
- **AC3 (QS-03):** Flags evaluators with $> 80\%$ position bias.
- **AC4 (QS-04):** Flags intransitive cycles ($A \succ B \succ C \succ A$) $> 20\%$ of testable triples.
- **AC5 (QS-05):** Flags speed runs with average task time $< 3000\text{ ms}$.
- **Verify:** `tests/unit/quality-signals.test.ts` (PASSED).

---

## 8. Export Service (FR-EXPORT)

### FR-EXPORT-01 / FR-EXPORT-02 / FR-EXPORT-05 / FR-EXPORT-06: 4-Sheet XLSX Export
- **AC1:** Workbook contains exactly 4 worksheets:
  1. `Group Summary`
  2. `Individual Summary`
  3. `Pair Coverage`
  4. `Metadata` (formula version, configuration, export timestamp)
- **AC2:** Filename matches `{classroom_slug}_{assignment_slug}_{report}_{YYYYMMDD-HHmm}.xlsx`.
- **Verify:** `tests/unit/export-service.test.ts` (PASSED).
