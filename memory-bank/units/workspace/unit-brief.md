# Unit: Workspace and Excel

## Purpose

ให้ครูและนักเรียนใช้ความสามารถของระบบผ่านหน้าจอภาษาไทยที่ใช้ธีมร่วมกัน

## Responsibilities

- MUI dialogs, assignment/group/question/results views and polling
- Browser-local demo, Excel import/export and accessible interactions
- Excel: first worksheet column A, 1–100 questions, at most 5 MB, explicit save after import

## NOT Responsible For

- Server authorization and source-of-truth voting rules

## Dependencies

- Depends on: auth/assignment client API adapters, domain values and shared MUI theme
- Used by: app/page.tsx

## Key Business Rules

- Import questions only before voting; never silently persist an imported file
- Export answer rows and group totals/averages to separate worksheets
- Server validation remains authoritative regardless of disabled/hidden UI controls

## Key Stories

US00, US09, US10 in `docs/backlog.md`.

## Bolt Type

Simple Construction — UI composition and file integration.
