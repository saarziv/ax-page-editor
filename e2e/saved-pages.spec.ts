import { expect, test } from '@playwright/test';

// Runs against the dev's api, so this saves sample:demo into the dev database (feature 04 plan, Tests).
test('a saved page is listed on the start screen, and clicking it opens the page', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();
  await page.getByRole('region', { name: 'Preview' }).getByRole('img', { name: 'Customer growth' }).click();
  await page.getByRole('switch', { name: 'Hide from AI' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();

  await page.reload();
  const savedPages = page.getByRole('region', { name: 'Saved pages' });
  const demoRow = savedPages.getByRole('button', { name: /^sample:demo/ });
  await expect(demoRow).toContainText('1 change · saved just now');

  await demoRow.click();
  await expect(page.getByRole('heading', { name: 'Analytics that scale with you' })).toBeVisible();
  await expect(page.getByLabel('Page URL')).toHaveValue('sample:demo');
});

test('when the saved pages list fails, the rest of the start screen still works', async ({ page }) => {
  await page.route('**/api/configs', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ status: 500, body: '{}' }) : route.continue(),
  );
  await page.goto('/');

  // TanStack Query retries a failed request a few times before showing the error.
  await expect(page.getByText("Saved pages couldn't be loaded.")).toBeVisible({ timeout: 15_000 });

  await page.getByText('Try a sample').click();
  await expect(page.getByRole('heading', { name: 'Analytics that scale with you' })).toBeVisible();
});
