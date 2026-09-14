import { expect, test } from '../fixtures';

test.describe('Evaluation Workspace Feature', () => {
  test('evaluator can complete pairwise comparisons', async ({ page }) => {
    await page.goto('/evaluate');
    
    // Check initial state
    await expect(page.getByText('Group Evaluation')).toBeVisible();
    await expect(page.getByText('0 / 2 ✓')).toBeVisible();

    // Select options (6-point scale)
    // Click '1' on first pair
    const radios = page.locator('input[type="radio"]');
    // For the first pair, we select the 1st option (index 0)
    await radios.nth(0).click({ force: true });
    
    // Check autosave and progress
    await expect(page.getByText('1 / 2 ✓')).toBeVisible();
    await expect(page.getByText('กำลังบันทึก...')).toBeVisible();
    
    // Select option on the second pair (index 6 would be the 1st option of the 2nd pair)
    await radios.nth(6).click({ force: true });
    
    // Progress should be full
    await expect(page.getByText('2 / 2 ✓')).toBeVisible();

    // Handle alert on submit
    page.on('dialog', dialog => dialog.accept());
    
    // Click submit
    await page.getByTestId('submit-evaluation').click();
  });
});
