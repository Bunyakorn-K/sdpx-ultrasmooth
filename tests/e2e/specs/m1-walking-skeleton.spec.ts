import { expect, test } from '@playwright/test';

// Full M1 walking-skeleton flow, exercised through the real UI and real
// Postgres (no fixture DB/seeding here — see docs/erd.md note on why:
// Docker isn't available on this dev machine, so there's no ephemeral test
// database to reset between runs yet; each run creates its own uniquely
// named assignment/emails so it doesn't collide with prior runs).
//
// Note: waits use 'load', not 'networkidle' — Next's dev-mode HMR keeps a
// persistent WebSocket open, so 'networkidle' never actually fires and just
// hangs until its own timeout.
test.describe('M1 walking skeleton', () => {
  test('login → assignment → join code → questions → groups → start voting → rate → see results', async ({ page }) => {
    test.setTimeout(60_000);
    const suffix = Math.random().toString(36).slice(2, 8);
    const instructorEmail = `instructor-${suffix}@e2e.test`;
    const studentEmails = Array.from({ length: 3 }, (_, i) => `student${i + 1}-${suffix}@e2e.test`);

    // 1. Sign in (dev stub auth)
    await page.goto('/sign-in');
    await page.waitForLoadState('load');
    await page.getByPlaceholder('you@uni.ac.th').fill(instructorEmail);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/classrooms$/, { timeout: 15_000 });

    // 2. Create an assignment directly (no classroom step)
    const assignmentName = `Milestone ${suffix}`;
    await page.getByLabel('Assignment name').fill(assignmentName);
    await page.getByRole('button', { name: 'Create assignment' }).click();
    await expect(page).toHaveURL(/\/assignments\/\d+$/, { timeout: 15_000 });
    const [, classroomId, assignmentId] = page.url().match(/classrooms\/(\d+)\/assignments\/(\d+)/) ?? [];
    expect(assignmentId).toBeTruthy();
    const joinCode = await page.locator('code').first().textContent();
    expect(joinCode).toBeTruthy();

    // 3-4. Students join by code. Under dev auth a brand-new account counts
    // as a teacher, so `role: 'student'` seeds them as students first.
    for (const email of studentEmails) {
      await page.request.post('/api/auth/dev-sign-in', { data: { email, role: 'student' } });
      const joined = await (await page.request.post('/api/classrooms/join', { data: { code: joinCode } })).json();
      expect(String(joined.assignmentId)).toBe(assignmentId);
    }
    await page.request.post('/api/auth/dev-sign-in', { data: { email: instructorEmail } });
    await page.goto(`/classrooms/${classroomId}/assignments/${assignmentId}`);

    // 5. Add a 5-point question
    await page.getByPlaceholder('e.g. How clear was the presentation?').fill('How clear was the work?');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('How clear was the work?')).toBeVisible({ timeout: 15_000 });

    // 6. Three students form groups for this assignment
    for (const [i, email] of studentEmails.entries()) {
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
