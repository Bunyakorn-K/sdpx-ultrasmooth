import { expect, test } from '@playwright/test';

// Full M1 walking-skeleton flow, exercised through the real UI and real
// Postgres (no fixture DB/seeding here — see docs/erd.md note on why:
// Docker isn't available on this dev machine, so there's no ephemeral test
// database to reset between runs yet; each run creates its own uniquely
// named classroom/assignment/emails so it doesn't collide with prior runs).
//
// Note: waits use 'load', not 'networkidle' — Next's dev-mode HMR keeps a
// persistent WebSocket open, so 'networkidle' never actually fires and just
// hangs until its own timeout.
test.describe('M1 walking skeleton', () => {
  test('login → classroom → CSV import → assignment → questions → groups → start voting → rate → see results', async ({ page }) => {
    test.setTimeout(60_000);
    const suffix = Math.random().toString(36).slice(2, 8);
    const instructorEmail = `instructor-${suffix}@e2e.test`;
    const studentEmails = Array.from({ length: 6 }, (_, i) => `student${i + 1}-${suffix}@e2e.test`);

    // 1. Sign in (dev stub auth)
    await page.goto('/sign-in');
    await page.waitForLoadState('load');
    await page.getByPlaceholder('you@uni.ac.th').fill(instructorEmail);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/classrooms$/, { timeout: 15_000 });

    // 2. Create classroom
    await page.getByRole('link', { name: 'New classroom' }).click();
    const classroomName = `E2E Classroom ${suffix}`;
    await page.getByPlaceholder('CS491 - Senior Project').fill(classroomName);
    await page.getByRole('button', { name: 'Create classroom' }).click();
    await expect(page.getByRole('heading', { name: classroomName })).toBeVisible({ timeout: 15_000 });

    const classroomId = page.url().match(/classrooms\/(\d+)/)?.[1];
    expect(classroomId).toBeTruthy();

    // 3. Import roster CSV — FR-CLASS-01/02/03
    const csv = [
      'email,group_name,display_name',
      ...studentEmails.map((email, i) => `${email},Group ${Math.floor(i / 2) + 1},Student ${i + 1}`),
    ].join('\n');

    await page.setInputFiles('input[type="file"]', {
      name: 'roster.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
    await page.getByRole('button', { name: 'Import' }).click();
    await expect(page.getByText(/Imported 6 students/)).toBeVisible({ timeout: 15_000 });

    // 4. Create assignment (single criterion, group side only — M1 scope)
    const assignmentName = `Milestone ${suffix}`;
    await page.getByPlaceholder('New assignment name').fill(assignmentName);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page).toHaveURL(/\/assignments\/\d+$/, { timeout: 15_000 });
    const assignmentId = page.url().match(/assignments\/(\d+)/)?.[1];

    // 5. Add a 5-point question
    await page.getByPlaceholder('e.g. How clear was the presentation?').fill('How clear was the work?');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('How clear was the work?')).toBeVisible({ timeout: 15_000 });

    // 6. Three students form groups for this assignment
    for (const [i, email] of studentEmails.slice(0, 3).entries()) {
      await page.request.post('/api/auth/dev-sign-in', { data: { email } });
      expect((await page.request.post(`/api/assignments/${assignmentId}/groups`, { data: { name: `Team ${i + 1}` } })).status()).toBe(201);
    }

    // 7. Start voting
    await page.request.post('/api/auth/dev-sign-in', { data: { email: instructorEmail } });
    await page.reload();
    await expect(page.getByText('READY', { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Start voting' }).click();
    await expect(page.getByText('Voting is open.')).toBeVisible({ timeout: 15_000 });

    // 8. Vote as one student: two other groups, one question each
    await page.request.post('/api/auth/dev-sign-in', { data: { email: studentEmails[0] } });
    await page.goto(`/classrooms/${classroomId}/assignments/${assignmentId}/evaluate`);
    await expect(page.getByText('0 / 2 scored')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: '4 of 5' }).first().click();
    await expect(page.getByText('1 / 2 scored')).toBeVisible({ timeout: 15_000 });

    // 9. Teacher sees the average
    await page.request.post('/api/auth/dev-sign-in', { data: { email: instructorEmail } });
    await page.goto(`/classrooms/${classroomId}/assignments/${assignmentId}`);
    await expect(page.getByRole('cell', { name: '4.00' }).first()).toBeVisible({ timeout: 15_000 });
  });
});
