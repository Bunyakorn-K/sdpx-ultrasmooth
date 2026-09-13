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
    await expect(homePage.homeLink).toBeVisible();
    await expect(homePage.howItWorksLink).toBeVisible();
    await expect(homePage.aboutLink).toBeVisible();
  });
});