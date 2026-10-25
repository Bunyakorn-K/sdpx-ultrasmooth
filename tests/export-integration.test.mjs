import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPairEvalWorkbook,
  formatExportFilename,
} from "../src/features/pairwise/services/export-service.ts";
import { exportAnswersToExcel } from "../src/features/assignments/services/excel-service.ts";
import { makeAssignment } from "./factories.ts";

const AT = "2026-08-03T07:30:00.000Z";
const SHEET_NAMES = [
  "Group Summary",
  "Individual Summary",
  "Pair Coverage",
  "Metadata",
];

// Two groups, one GROUP criterion and one INDIVIDUAL criterion, five comparisons
// spread over three pair assignments. Deliberately mixes SUBMITTED, DRAFT and
// EXCLUDED comparisons so the export's counting rules are exercised for real
// instead of being stubbed.
//
// Group coverage of g-1/g-2 on criterion `crit-team` (submitted only):
//   c-1 (p-1, left=g-1, choice 1) -> g-1 +1.0, g-2 +0.0
//   c-2 (p-1, left=g-1, choice 6) -> g-1 +0.0, g-2 +1.0
//   c-3 (p-1, left=g-1, choice 1) -> g-1 +1.0, g-2 +0.0
//   c-4 (p-2, left=g-2, choice 1) -> g-1 +0.0, g-2 +1.0
//   c-7 (p-3, left=g-1, choice 1) -> g-1 +1.0, g-2 +0.0
// g-1: 3.0/5 = q 0.6 -> ratio 0.84 -> weighted 7.56
// g-2: 2.0/5 = q 0.4 -> ratio 0.76 -> weighted 6.84
function makeExportData() {
  const member = (over) => ({
    id: over.user_id,
    classroom_id: "class-1",
    user_id: over.user_id,
    role: "STUDENT",
    group_id: over.group_id,
    email: `${over.user_id}@example.com`,
    display_name: over.display_name,
    student_id: over.student_id,
    joined_at: AT,
    ...over,
  });

  return {
    classroom: {
      id: "class-1",
      name: "วิศวกรรมซอฟต์แวร์ 2569",
      slug: "se2026",
      timezone: "Asia/Bangkok",
      allowed_email_domains: ["uni.ac.th"],
      status: "ACTIVE",
      created_by: "u-t",
      created_at: AT,
    },
    assignment: {
      id: "assign-1",
      classroom_id: "class-1",
      name: "โครงงานคู่หู",
      slug: "pair-project",
      description: "ประเมินเพื่อนร่วมทีม",
      group_max_score: 15,
      individual_max_score: 5,
      group_deadline_utc: "2026-08-10T17:00:00Z",
      individual_deadline_utc: "2026-08-10T17:00:00Z",
      instructor_weight: 2.5,
      target_coverage: 5,
      max_workload: 8,
      min_comparisons: 3,
      score_floor: 0.6,
      score_ceiling: 1.0,
      completion_threshold: 0.9,
      scoring_formula_version: "v2.0",
      pairing_seed: 42,
      status: "FINALIZED",
      criteria: [
        {
          id: "crit-team",
          assignment_id: "assign-1",
          side: "GROUP",
          name: "การทำงานเป็นทีม",
          description: "",
          weight_pct: 60,
          display_order: 1,
        },
        {
          id: "crit-duty",
          assignment_id: "assign-1",
          side: "INDIVIDUAL",
          name: "ความรับผิดชอบ",
          description: "",
          weight_pct: 40,
          display_order: 2,
        },
      ],
      created_by: "u-t",
      created_at: AT,
    },
    groups: [
      { id: "g-1", classroom_id: "class-1", name: "ทีมไฟล์", created_at: AT },
      { id: "g-2", classroom_id: "class-1", name: "ทีมน้ำ", created_at: AT },
    ],
    members: [
      member({
        user_id: "u-1",
        display_name: "สมชาย",
        student_id: "66010001",
        group_id: "g-1",
      }),
      member({
        user_id: "u-2",
        display_name: "วิภาดา",
        student_id: "66010002",
        group_id: "g-2",
      }),
      member({
        user_id: "u-3",
        display_name: "ธนกร",
        student_id: undefined,
        group_id: "g-1",
      }),
      member({
        user_id: "u-t",
        display_name: "อาจารย์",
        group_id: null,
        role: "OWNER",
      }),
    ],
    pairs: [
      pair("p-1", "g-1", "g-2", "u-1", "g-1"),
      pair("p-2", "g-1", "g-2", "u-1", "g-2"),
      pair("p-3", "g-2", "g-1", "u-3", "g-1"),
    ],
    comparisons: [
      comp("c-1", "p-1", "u-1", 1, "SUBMITTED"),
      comp("c-2", "p-1", "u-2", 6, "SUBMITTED"),
      comp("c-3", "p-1", "u-3", 1, "SUBMITTED"),
      comp("c-4", "p-2", "u-2", 1, "SUBMITTED"),
      comp("c-5", "p-2", "u-3", 1, "DRAFT"),
      comp("c-6", "p-3", "u-1", 1, "EXCLUDED", {
        excluded_reason: "speed run",
      }),
      comp("c-7", "p-3", "u-2", 1, "SUBMITTED"),
    ],
  };
}

function pair(id, itemA, itemB, evaluator, left) {
  return {
    id,
    assignment_id: "assign-1",
    criterion_id: "crit-team",
    side: "GROUP",
    item_a_id: itemA,
    item_b_id: itemB,
    evaluator_user_id: evaluator,
    display_left_item_id: left,
    generation: 1,
    source: "AUTO",
    created_at: AT,
  };
}

function comp(id, pairId, evaluator, choice, status, extra = {}) {
  return {
    id,
    pair_assignment_id: pairId,
    evaluator_user_id: evaluator,
    choice,
    status,
    time_on_task_ms: 5000,
    saved_at: AT,
    submitted_at: status === "SUBMITTED" ? AT : undefined,
    ...extra,
  };
}

// Build the workbook, serialise it to the bytes a browser would download, then
// read those bytes back with ExcelJS. Only the reloaded workbook is asserted on,
// so every expectation below is about the file the user actually receives.
async function writeAndReload(data = makeExportData()) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = await buildPairEvalWorkbook(data);
  const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
  assert.equal(
    bytes.subarray(0, 2).toString("latin1"),
    "PK",
    "exported file must be a real xlsx (zip) container",
  );
  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(bytes);
  return { bytes, reloaded };
}

function metaValue(reloaded, property) {
  const sheet = reloaded.getWorksheet("Metadata");
  assert.ok(sheet, "Metadata sheet must exist");
  const row = sheet
    .getRows(1, sheet.rowCount)
    ?.find((r) => r.getCell(1).value === property);
  assert.ok(row, `Metadata must carry a "${property}" row`);
  return row.getCell(2).value;
}

test("FR-EXPORT-02: exported file round-trips to exactly the 4 required sheets in order", async () => {
  const { reloaded } = await writeAndReload();
  assert.deepEqual(
    reloaded.worksheets.map((s) => s.name),
    SHEET_NAMES,
  );
  assert.deepEqual(
    SHEET_NAMES.map((name) => {
      const sheet = reloaded.getWorksheet(name);
      assert.ok(sheet, `${name} must survive serialisation`);
      return [name, sheet.rowCount > 0];
    }),
    SHEET_NAMES.map((name) => [name, true]),
  );
});

test("FR-EXPORT-02: Group Summary carries the engine's per-criterion scores for every group", async () => {
  const { reloaded } = await writeAndReload();
  const sheet = reloaded.getWorksheet("Group Summary");
  assert.deepEqual(sheet.getRow(1).values.slice(1), [
    "Group Name",
    "Criterion",
    "Weight (%)",
    "Quality Index (q)",
    "Comparison Count",
    "Score Ratio",
    "Weighted Score",
    "Flags",
  ]);
  assert.equal(
    sheet.rowCount,
    3,
    "one row per group for the single GROUP criterion",
  );
  assert.deepEqual(sheet.getRow(2).values.slice(1, 8), [
    "ทีมไฟล์",
    "การทำงานเป็นทีม",
    60,
    0.6,
    5,
    0.84,
    7.56,
  ]);
  assert.deepEqual(sheet.getRow(3).values.slice(1, 8), [
    "ทีมน้ำ",
    "การทำงานเป็นทีม",
    60,
    0.4,
    5,
    0.76,
    6.84,
  ]);
});

test("FR-EXPORT-02 & FR-EXPORT-06: Individual Summary applies participation multiplier and flag rules", async () => {
  const { reloaded } = await writeAndReload();
  const sheet = reloaded.getWorksheet("Individual Summary");
  assert.deepEqual(sheet.getRow(1).values.slice(1), [
    "Student Name",
    "Student ID",
    "Group Name",
    "Criterion",
    "Weight (%)",
    "Quality Index (q)",
    "Comparison Count",
    "Weighted Score",
    "Participation (p)",
    "Multiplier (M)",
    "Personal Final Score",
    "Flags",
  ]);
  // Non-students (the OWNER member) must not appear: assigned pairs p-1/p-2 and
  // one submitted comparison give u-1 p = 1/2 = 0.5, so M = 0.5/0.9 = 0.5556.
  assert.equal(
    sheet.rowCount,
    4,
    "three students, one row each — owner excluded",
  );
  assert.deepEqual(sheet.getRow(2).values.slice(1, 13), [
    "สมชาย",
    "66010001",
    "ทีมไฟล์",
    "ความรับผิดชอบ",
    40,
    0.5,
    0,
    1.6,
    0.5,
    0.5556,
    5.09,
    "LOW_CONFIDENCE",
  ]);
  assert.deepEqual(sheet.getRow(3).values.slice(1, 13), [
    "วิภาดา",
    "66010002",
    "ทีมน้ำ",
    "ความรับผิดชอบ",
    40,
    0.5,
    0,
    1.6,
    1,
    1,
    8.44,
    "LOW_CONFIDENCE",
  ]);
  // A student with no student number falls back to "-" rather than an empty cell.
  assert.equal(sheet.getRow(4).getCell(2).value, "-");
  assert.equal(sheet.getRow(4).getCell(9).value, 1);
  assert.equal(sheet.getRow(4).getCell(11).value, 9.16);
});

test("FR-EXPORT-02: Pair Coverage counts only SUBMITTED comparisons and grades against min_comparisons", async () => {
  const { reloaded } = await writeAndReload();
  const sheet = reloaded.getWorksheet("Pair Coverage");
  assert.deepEqual(sheet.getRow(1).values.slice(1), [
    "Pair ID",
    "Side",
    "Criterion",
    "Item A",
    "Item B",
    "Target Coverage (R)",
    "Actual Coverage",
    "Status",
  ]);
  assert.equal(sheet.rowCount, 4);
  assert.deepEqual(sheet.getRow(2).values.slice(1), [
    "p-1",
    "GROUP",
    "การทำงานเป็นทีม",
    "ทีมไฟล์",
    "ทีมน้ำ",
    5,
    3,
    "SUFFICIENT",
  ]);
  // p-2 has one SUBMITTED plus one DRAFT, p-3 one SUBMITTED plus one EXCLUDED:
  // the draft and the excluded comparison must not inflate coverage.
  assert.deepEqual(sheet.getRow(3).values.slice(1), [
    "p-2",
    "GROUP",
    "การทำงานเป็นทีม",
    "ทีมไฟล์",
    "ทีมน้ำ",
    5,
    1,
    "LOW_COVERAGE",
  ]);
  assert.deepEqual(sheet.getRow(4).values.slice(1), [
    "p-3",
    "GROUP",
    "การทำงานเป็นทีม",
    "ทีมน้ำ",
    "ทีมไฟล์",
    5,
    1,
    "LOW_COVERAGE",
  ]);
});

test("FR-EXPORT-06: Metadata records the formula version, full config and the export timestamp", async () => {
  const before = Date.now();
  const { reloaded } = await writeAndReload();
  const after = Date.now();

  assert.deepEqual(metaValue(reloaded, "Classroom"), "วิศวกรรมซอฟต์แวร์ 2569");
  assert.equal(metaValue(reloaded, "Classroom Slug"), "se2026");
  assert.equal(metaValue(reloaded, "Assignment"), "โครงงานคู่หู");
  assert.equal(metaValue(reloaded, "Assignment Slug"), "pair-project");
  assert.equal(metaValue(reloaded, "Scoring Formula Version"), "v2.0");
  assert.equal(metaValue(reloaded, "Group Max Score"), 15);
  assert.equal(metaValue(reloaded, "Individual Max Score"), 5);
  assert.equal(metaValue(reloaded, "Score Floor"), 0.6);
  assert.equal(metaValue(reloaded, "Score Ceiling"), 1);
  assert.equal(metaValue(reloaded, "Completion Threshold"), 0.9);
  assert.equal(metaValue(reloaded, "Instructor Weight"), 2.5);

  const exportedAt = metaValue(reloaded, "Exported At (UTC)");
  const iso =
    exportedAt instanceof Date ? exportedAt.toISOString() : String(exportedAt);
  const stamp = Date.parse(iso);
  assert.ok(
    !Number.isNaN(stamp),
    `Exported At must be a parseable timestamp, got ${iso}`,
  );
  assert.ok(
    stamp >= before - 1000 && stamp <= after + 1000,
    "Exported At must be the moment of export, not a fixed placeholder",
  );
});

test("FR-EXPORT-05: filename uses {classroom_slug}_{assignment_slug}_{report}_{YYYYMMDD-HHmm}.xlsx in UTC", async () => {
  const filename = formatExportFilename(
    "se2026",
    "pair-project",
    "results",
    new Date(AT),
  );
  assert.equal(filename, "se2026_pair-project_results_20260803-0730.xlsx");
  // Month/day/hour/minute must be zero-padded, and UTC — not local time — is used.
  assert.equal(
    formatExportFilename(
      "c",
      "a",
      "results",
      new Date("2026-01-05T04:07:00.000Z"),
    ),
    "c_a_results_20260105-0407.xlsx",
  );
});

test("FR-EXPORT-05: the browser download path wires the filename and blob together", async () => {
  const { anchor, bytes } = await captureDownload(exportFixture());
  const before = formatExportFilename(
    "classroom",
    "pair-project-2026",
    "results",
    new Date(),
  );
  const after = formatExportFilename(
    "classroom",
    "pair-project-2026",
    "results",
    new Date(),
  );

  assert.match(
    anchor.download,
    /^classroom_pair-project-2026_results_\d{8}-\d{4}\.xlsx$/,
  );
  assert.ok(
    [before, after].includes(anchor.download),
    `download name ${anchor.download} must be generated at export time from the assignment title`,
  );

  // The blob handed to the browser must itself be a loadable 4-sheet workbook.
  const { default: ExcelJS } = await import("exceljs");
  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(bytes);
  assert.deepEqual(
    reloaded.worksheets.map((s) => s.name),
    SHEET_NAMES,
  );
});

test("export exposes no evaluator identity in the aggregate workbook", async () => {
  const { reloaded } = await writeAndReload();
  const leaked = [];
  for (const sheet of reloaded.worksheets) {
    sheet.eachRow((row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const text = String(cell.value ?? "");
        if (/@example\.com|\bu-[0-9]\b/.test(text))
          leaked.push(`${sheet.name}:${text}`);
      });
    });
  }
  assert.deepEqual(leaked, []);
});

function exportFixture(overrides = {}) {
  const student = { id: "s-1", name: "สมชาย" };
  const other = { id: "s-2", name: "วิภาดา" };
  const g1 = { id: "g-1", name: "ทีมไฟล์", members: [student] };
  const g2 = { id: "g-2", name: "ทีมน้ำ", members: [other] };
  return makeAssignment({
    title: "Pair Project 2026",
    status: "closed",
    questions: ["ความครบถ้วน", "ความคิดสร้างสรรค์"],
    students: [student, other],
    groups: [g1, g2],
    votes: [
      { userId: student.id, groupId: g2.id, scores: [5, 4], createdAt: AT },
    ],
    ...overrides,
  });
}

// The app-path workbook is only reachable through the download, so reload the
// captured bytes to assert on the same cells a teacher would open.
async function reloadCaptured(assignment) {
  const { bytes } = await captureDownload(assignment);
  const { default: ExcelJS } = await import("exceljs");
  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(bytes);
  return reloaded;
}

// exportAnswersToExcel drives document/URL browser APIs; stand in for them and
// keep the bytes the browser would have received.
async function captureDownload(assignment) {
  const saved = {
    document: globalThis.document,
    createObjectURL: URL.createObjectURL,
    revokeObjectURL: URL.revokeObjectURL,
  };
  const anchor = {
    href: "",
    download: "",
    clicked: false,
    click() {
      this.clicked = true;
    },
  };
  let blob = null;

  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, "a");
      return anchor;
    },
  };
  URL.createObjectURL = (value) => {
    blob = value;
    return "blob:captured";
  };
  URL.revokeObjectURL = () => {};

  try {
    await exportAnswersToExcel(assignment);
  } finally {
    if (saved.document === undefined) delete globalThis.document;
    else globalThis.document = saved.document;
    URL.createObjectURL = saved.createObjectURL;
    URL.revokeObjectURL = saved.revokeObjectURL;
  }

  assert.ok(anchor.clicked, "export must trigger the download");
  assert.ok(blob, "export must hand a blob to the browser");
  return { anchor, bytes: Buffer.from(await blob.arrayBuffer()) };
}

test("FR-EXPORT-03: raw comparison export defaults to pseudonymous evaluator IDs", async () => {
  const { rawExportFixture } = await import("./fakes/raw-export-fixture.ts");
  const f = rawExportFixture();
  const result = await f.service.export(f.teacher, f.assignment.id, {});
  assert.ok(result.csv.startsWith("\uFEFF"));
  assert.ok(result.csv.includes("anon-"));
  assert.ok(!result.csv.includes(f.student.id));
  assert.ok(!result.csv.includes(f.student.name));
  assert.ok(!result.csv.includes(f.student.email));
  assert.equal(f.lookups.length, 0);
  assert.equal(result.csv.trim().split("\r\n").length, 3);
});

test("FR-EXPORT-04: identity-revealing export is OWNER-only, confirmed, and audited", async () => {
  const { rawExportFixture } = await import("./fakes/raw-export-fixture.ts");
  const f = rawExportFixture();
  await assert.rejects(
    f.service.export(f.student, f.assignment.id, {
      identityMode: "identified",
      confirmIdentity: true,
    }),
    { status: 403 },
  );
  await assert.rejects(
    f.service.export(f.teacher, f.assignment.id, {
      identityMode: "identified",
    }),
    { status: 400 },
  );
  assert.equal(f.audits.length, 0);
  const result = await f.service.export(f.teacher, f.assignment.id, {
    identityMode: "identified",
    confirmIdentity: true,
  });
  assert.ok(result.csv.includes(f.student.email));
  assert.equal(f.audits.length, 1);
  assert.equal(f.audits[0].action, "EXPORT_IDENTITY");
  assert.equal(f.audits[0].actor_id, f.teacher.id);
});

// The results screen honours the values a teacher sets in the assignment editor
// (`active.groupMaxScore ?? 15` and friends in pairwise-reports-panel.tsx), so
// the download has to use the same values or the file contradicts the screen.
test("FR-EXPORT-06: the app export path uses the assignment's configured scoring values", async () => {
  const workbook = await reloadCaptured(
    exportFixture({
      groupMaxScore: 30,
      individualMaxScore: 10,
      scoreFloor: 0.5,
      scoreCeiling: 0.9,
      targetCoverage: 4,
      minComparisons: 2,
      completionThreshold: 0.8,
      instructorWeight: 2,
    }),
  );
  assert.equal(metaValue(workbook, "Group Max Score"), 30);
  assert.equal(metaValue(workbook, "Individual Max Score"), 10);
  assert.equal(metaValue(workbook, "Score Floor"), 0.5);
  assert.equal(metaValue(workbook, "Score Ceiling"), 0.9);
  assert.equal(metaValue(workbook, "Completion Threshold"), 0.8);
  assert.equal(metaValue(workbook, "Instructor Weight"), 2);
  assert.equal(
    workbook.getWorksheet("Pair Coverage").getRow(2).getCell(6).value,
    4,
  );
});

test("FR-EXPORT-06: an assignment without configured values still exports the documented defaults", async () => {
  const workbook = await reloadCaptured(exportFixture());
  assert.equal(metaValue(workbook, "Group Max Score"), 15);
  assert.equal(metaValue(workbook, "Individual Max Score"), 5);
  assert.equal(metaValue(workbook, "Score Floor"), 0.6);
  assert.equal(metaValue(workbook, "Completion Threshold"), 0.9);
  assert.equal(
    workbook.getWorksheet("Pair Coverage").getRow(2).getCell(6).value,
    5,
  );
});
