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
  test('login → classroom → CSV import → assignment → publish → evaluate → see score', async ({ page }) => {
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

    // 5. Publish — feasibility must show FEASIBLE before the button works
    await expect(page.getByText('FEASIBLE')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Publish & generate pairs' }).click();
    await expect(page.getByText('Published — pairs have been generated.')).toBeVisible({ timeout: 15_000 });

    // 6. Evaluate as one student (switch identity via the same cookie jar)
    await page.request.post('/api/auth/dev-sign-in', { data: { email: studentEmails[0] } });
    await page.goto(`/classrooms/${classroomId}/assignments/${assignmentId}/evaluate`);
    await page.waitForLoadState('load');
    await expect(page.getByRole('radiogroup')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('radio', { name: 'ขวาดีกว่า', exact: true }).click();
    await page.getByRole('button', { name: 'Submit & Next Pair' }).click();
    await expect(page.getByText('1 / 1')).toBeVisible({ timeout: 15_000 });

    // 7. See score
    await page.goto(`/classrooms/${classroomId}/assignments/${assignmentId}/report`);
    await expect(page.getByText('Participation')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Group score/)).toBeVisible({ timeout: 15_000 });
  });
});
