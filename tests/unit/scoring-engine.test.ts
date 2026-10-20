import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateParticipation,
  calculateParticipationMultiplier,
  calculateQualityIndex,
  calculateScoreRatio,
  calculateWeightedScore,
  CHOICE_POINTS,
  getComparisonPoints,
} from "@/features/pairwise/domain/scoring-engine";
import type {
  Comparison,
  PairAssignment,
} from "@/features/pairwise/types";

test("§9.1: 6-point forced choice point conversion table", () => {
  assert.deepEqual(CHOICE_POINTS[1], { s_left: 1.0, s_right: 0.0, label: "ซ้ายดีกว่ามาก" });
  assert.deepEqual(CHOICE_POINTS[2], { s_left: 0.8, s_right: 0.2, label: "ซ้ายดีกว่า" });
  assert.deepEqual(CHOICE_POINTS[3], { s_left: 0.6, s_right: 0.4, label: "ซ้ายดีกว่าเล็กน้อย" });
  assert.deepEqual(CHOICE_POINTS[4], { s_left: 0.4, s_right: 0.6, label: "ขวาดีกว่าเล็กน้อย" });
  assert.deepEqual(CHOICE_POINTS[5], { s_left: 0.2, s_right: 0.8, label: "ขวาดีกว่า" });
  assert.deepEqual(CHOICE_POINTS[6], { s_left: 0.0, s_right: 1.0, label: "ขวาดีกว่ามาก" });
});

test("§9.1: getComparisonPoints accounts for randomized display_left_item_id", () => {
  const pair: PairAssignment = {
    id: "p1",
    assignment_id: "a1",
    criterion_id: "c1",
    side: "GROUP",
    item_a_id: "group-A",
    item_b_id: "group-B",
    evaluator_user_id: "u1",
    display_left_item_id: "group-B", // B was randomized to left!
    generation: 1,
    source: "AUTO",
    created_at: new Date().toISOString(),
  };

  const comp: Comparison = {
    id: "comp1",
    pair_assignment_id: "p1",
    evaluator_user_id: "u1",
    choice: 2, // "ซ้ายดีกว่า" -> s_left = 0.8, s_right = 0.2
    status: "SUBMITTED",
    saved_at: new Date().toISOString(),
  };

  // Because group-B is on the left, group-B receives s_left (0.8) and group-A receives s_right (0.2)
  assert.equal(getComparisonPoints(comp, pair, "group-B"), 0.8);
  assert.equal(getComparisonPoints(comp, pair, "group-A"), 0.2);
});

test("§9.5 GOLDEN TEST: PRD Worked Example (Aurora group, Nok, and Ton)", () => {
  const groupMaxScore = 15;
  const individualMaxScore = 5;
  const scoreFloor = 0.6;
  const scoreCeiling = 1.0;
  const completionThreshold = 0.9;

  // 1. Group Aurora calculations
  // UX q = 0.72
  const uxRatio = calculateScoreRatio(0.72, scoreFloor, scoreCeiling);
  assert.equal(uxRatio, 0.888);
  const uxScore = calculateWeightedScore(uxRatio, 40, groupMaxScore);
  assert.equal(uxScore, 5.328);

  // Completeness q = 0.55
  const compRatio = calculateScoreRatio(0.55, scoreFloor, scoreCeiling);
  assert.equal(compRatio, 0.82);
  const compScore = calculateWeightedScore(compRatio, 35, groupMaxScore);
  assert.equal(compScore, 4.305);

  // Innovation q = 0.61
  const innoRatio = calculateScoreRatio(0.61, scoreFloor, scoreCeiling);
  assert.equal(innoRatio, 0.844);
  const innoScore = calculateWeightedScore(innoRatio, 25, groupMaxScore);
  assert.equal(innoScore, 3.165);

  const auroraGroupTotal = Number((uxScore + compScore + innoScore).toFixed(3));
  assert.equal(auroraGroupTotal, 12.798);

  // 2. Nok (Aurora member) — submitted full participation (15 / 15)
  // Teamwork q = 0.68
  const nokTeamRatio = calculateScoreRatio(0.68, scoreFloor, scoreCeiling);
  assert.equal(nokTeamRatio, 0.872);
  const nokTeamScore = calculateWeightedScore(nokTeamRatio, 50, individualMaxScore);
  assert.equal(nokTeamScore, 2.18);

  // Management q = 0.45
  const nokMgmtRatio = calculateScoreRatio(0.45, scoreFloor, scoreCeiling);
  assert.equal(nokMgmtRatio, 0.78);
  const nokMgmtScore = calculateWeightedScore(nokMgmtRatio, 50, individualMaxScore);
  assert.equal(nokMgmtScore, 1.95);

  const nokIndivTotal = Number((nokTeamScore + nokMgmtScore).toFixed(3));
  assert.equal(nokIndivTotal, 4.13);

  const nokP = calculateParticipation(15, 15);
  assert.equal(nokP, 1.0);
  const nokM = calculateParticipationMultiplier(nokP, completionThreshold);
  assert.equal(nokM, 1.0);

  const nokFinalScore = Number(((auroraGroupTotal + nokIndivTotal) * nokM).toFixed(2));
  assert.equal(nokFinalScore, 16.93);

  // 3. Ton (Aurora member) — partial participation (submitted 6/12 group, 3/3 individual -> 9/15)
  // Teamwork q = 0.31
  const tonTeamRatio = calculateScoreRatio(0.31, scoreFloor, scoreCeiling);
  assert.equal(tonTeamRatio, 0.724);
  const tonTeamScore = calculateWeightedScore(tonTeamRatio, 50, individualMaxScore);
  assert.equal(tonTeamScore, 1.81);

  // Management q = 0.35
  const tonMgmtRatio = calculateScoreRatio(0.35, scoreFloor, scoreCeiling);
  assert.equal(tonMgmtRatio, 0.74);
  const tonMgmtScore = calculateWeightedScore(tonMgmtRatio, 50, individualMaxScore);
  assert.equal(tonMgmtScore, 1.85);

  const tonIndivTotal = Number((tonTeamScore + tonMgmtScore).toFixed(3));
  assert.equal(tonIndivTotal, 3.66);

  const tonP = calculateParticipation(9, 15);
  assert.equal(tonP, 0.6);
  const tonM = calculateParticipationMultiplier(tonP, completionThreshold);
  assert.equal(Number(tonM.toFixed(3)), 0.667);

  const tonFinalScore = Number(((auroraGroupTotal + tonIndivTotal) * tonM).toFixed(2));
  assert.equal(tonFinalScore, 10.97);

  // 4. Teammate integrity check (§9.4 / FR-SCORE-11)
  // Ton's participation penalty does NOT affect Nok's group score!
  assert.equal(auroraGroupTotal, 12.798);
});

test("calculateQualityIndex handles instructor weight correctly (§9.2, D6)", () => {
  const pair: PairAssignment = {
    id: "p1",
    assignment_id: "a1",
    criterion_id: "c1",
    side: "GROUP",
    item_a_id: "g1",
    item_b_id: "g2",
    evaluator_user_id: "inst-1",
    display_left_item_id: "g1",
    generation: 1,
    source: "AUTO",
    created_at: new Date().toISOString(),
  };

  const compInstructor: Comparison = {
    id: "c-inst",
    pair_assignment_id: "p1",
    evaluator_user_id: "inst-1",
    choice: 1, // g1 gets 1.0
    status: "SUBMITTED",
    saved_at: new Date().toISOString(),
  };

  const compStudent: Comparison = {
    id: "c-stud",
    pair_assignment_id: "p1",
    evaluator_user_id: "stud-1",
    choice: 6, // g1 gets 0.0
    status: "SUBMITTED",
    saved_at: new Date().toISOString(),
  };

  // With instructorWeight = 3.0:
  // g1 points = (3.0 * 1.0 + 1.0 * 0.0) / (3.0 + 1.0) = 3.0 / 4.0 = 0.75
  const result = calculateQualityIndex(
    "g1",
    "c1",
    [pair],
    [compInstructor, compStudent],
    { "inst-1": "OWNER", "stud-1": "STUDENT" },
    3.0,
  );

  assert.equal(result.q, 0.75);
  assert.equal(result.comparisonCount, 2);
  assert.equal(result.effectiveWeightSum, 4.0);
});
