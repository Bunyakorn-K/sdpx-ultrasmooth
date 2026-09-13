import { test as base, expect } from '@playwright/test';
import { testData } from '../seed/test-data';

type TestFixtures = {
  cleanDb: void;
};

export const test = base.extend<TestFixtures>({
  cleanDb: [
    async ({ request }, use) => {
      // Setup: seed test data before running test
      const seedRes = await request.post('/api/test/seed', {
        data: {
          records: testData.pairs,
        },
      });
      expect(seedRes.ok(), 'seed endpoint must succeed').toBeTruthy();

      await use();

      // Teardown: clean up database after test execution
      const cleanRes = await request.post('/api/test/cleanup');
      expect(cleanRes.ok(), 'cleanup endpoint must succeed').toBeTruthy();
    },
    { auto: true },
  ],
});

export { expect };