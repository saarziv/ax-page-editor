import { test as base } from '@playwright/test';

// The tests share the dev database, where sample:demo holds whatever a test saved last. So by default every page
// opens as if nothing were saved; tests that check restoring turn this off and read the real configuration.
export const test = base.extend<{ restoreSavedChanges: boolean }>({
  restoreSavedChanges: [false, { option: true }],
  page: async ({ page, restoreSavedChanges }, use) => {
    if (!restoreSavedChanges) {
      await page.route('**/api/configs/*', (route) =>
        route.request().method() === 'GET'
          ? route.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"NOT_FOUND"}' })
          : route.continue(),
      );
    }
    await use(page);
  },
});

export { expect } from '@playwright/test';
