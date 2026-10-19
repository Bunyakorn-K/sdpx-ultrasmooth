import { expect, test } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('Homepage Smoke Check', () => {
  // AC: Given user navigates to root, then see PairEval university evaluation system hero
  test('homepage loads correctly and displays core value proposition', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.heading).toBeVisible();
    await expect(homePage.universityLabel).toBeVisible();
    await expect(homePage.signInButton).toBeVisible();
    await expect(homePage.brandLink).toBeVisible();
    await expect(homePage.createAccountLink).toBeVisible();
    await expect(homePage.createAccountLink).toHaveAttribute('href', '/sign-up');
    await expect(homePage.signInButton.locator('..')).toHaveAttribute('href', '/sign-in');
    await expect(homePage.homeLink).toHaveCount(0);
    await expect(homePage.howItWorksLink).toHaveCount(0);
    await expect(homePage.aboutLink).toHaveCount(0);
  });
});
