import { test as base, expect, request } from '@playwright/test';

/**
 * Clear test data before each test
 */
async function clearTestData(baseURL: string) {
  try {
    const apiContext = await request.newContext({ baseURL });
    await apiContext.post('/api/test/clear');
    await apiContext.dispose();
  } catch {
    // Ignore errors - might not be available
  }
}

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    // Clear data before test
    if (baseURL) {
      await clearTestData(baseURL);
    }
    await use(page);
  },
});

export { expect };
