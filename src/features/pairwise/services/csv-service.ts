import type { Worksheet } from "exceljs";

export const CSV_REPORTS = {
  "group-summary": "Group Summary",
  "individual-summary": "Individual Summary",
  "pair-coverage": "Pair Coverage",
} as const;

export type CsvReport = keyof typeof CSV_REPORTS;

export function encodeCsv(
  rows: readonly (readonly (string | number)[])[],
): string {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value);
            // Prevent spreadsheet applications from interpreting user text as formulas.
            if (typeof value === "string" && /^[\s]*[=+@-]/.test(text))
              text = "'" + text;
            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\r\n") +
    "\r\n"
  );
}

export function worksheetToCsv(sheet: Worksheet): string {
  const rows: (string | number)[][] = [];
  sheet.eachRow((row) => {
    rows.push(
      Array.from({ length: sheet.columnCount }, (_, index) => {
        const cell = row.getCell(index + 1);
        return typeof cell.value === "number" ? cell.value : cell.text;
      }),
    );
  });
  return encodeCsv(rows);
}
