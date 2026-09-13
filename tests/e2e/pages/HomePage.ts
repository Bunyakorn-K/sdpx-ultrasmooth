import { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly heading: Locator;
  readonly universityLabel: Locator;
  readonly signInButton: Locator;
  readonly homeLink: Locator;
  readonly howItWorksLink: Locator;
  readonly aboutLink: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', {
      name: 'Fairer student evaluation through pairwise comparison',
    });
    this.universityLabel = page.getByText('University Evaluation System');
    this.signInButton = page.getByRole('button', { name: /sign in/i });
    this.homeLink = page.getByRole('link', { name: 'Home', exact: true });
    this.howItWorksLink = page.getByRole('link', { name: 'How it works', exact: true });
    this.aboutLink = page.getByRole('link', { name: 'About', exact: true });
  }

  async goto() {
    await this.page.goto('/');
  }
}