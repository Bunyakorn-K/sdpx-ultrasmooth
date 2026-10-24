import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  encodeCsv,
  worksheetToCsv,
} from "@/features/pairwise/services/csv-service";
import { formatExportFilename } from "@/features/pairwise/services/export-service";
const { Workbook } = createRequire(import.meta.url)(
  "exceljs",
) as typeof import("exceljs");

test("CSV preserves Thai, commas, quotes and line breaks with UTF-8 BOM and CRLF", () => {
  const csv = encodeCsv([
    ["ชื่อกลุ่ม", "คะแนน"],
    ['ทีม "ไทย", A\nB', 6],
  ]);
  assert.equal(csv, '\uFEFF"ชื่อกลุ่ม","คะแนน"\r\n"ทีม ""ไทย"", A\nB","6"\r\n');
  assert.deepEqual([...Buffer.from(csv).subarray(0, 3)], [0xef, 0xbb, 0xbf]);
});

test("CSV neutralizes spreadsheet formulas in text while preserving numeric values", () => {
  assert.equal(
    encodeCsv([["=1+1", "+SUM(A1)", "-1+1", "@SUM(A1)", " \t=1", -2, 0]]),
    '\uFEFF"\'=1+1","\'+SUM(A1)","\'-1+1","\'@SUM(A1)","\' \t=1","-2","0"\r\n',
  );
});

test("CSV exports workbook rows including empty cells and calculated numeric scores", () => {
  const wb = new Workbook();
  const sheet = wb.addWorksheet("Group Summary");
  sheet.addRow(["กลุ่ม", "คะแนน", "Flags"]);
  sheet.addRow(["ทีมหนึ่ง", 12.5, ""]);
  assert.equal(
    worksheetToCsv(sheet),
    '\uFEFF"กลุ่ม","คะแนน","Flags"\r\n"ทีมหนึ่ง","12.5",""\r\n',
  );
});

test("CSV filename follows report and UTC timestamp convention without changing XLSX default", () => {
  const now = new Date("2026-08-03T07:30:00Z");
  assert.equal(
    formatExportFilename("cs101", "project1", "group-summary", now, "csv"),
    "cs101_project1_group-summary_20260803-0730.csv",
  );
  assert.equal(
    formatExportFilename("cs101", "project1", "results", now),
    "cs101_project1_results_20260803-0730.xlsx",
  );
});
