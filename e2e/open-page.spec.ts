import { expect, test } from '@playwright/test';

test('typing a URL and clicking Open shows the stub editor', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Page URL').fill('https://example.com/page');
  await page.getByRole('button', { name: 'Open', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Stub page' })).toBeVisible();
  await expect(page.getByText('https://example.com/page', { exact: true })).toBeVisible();
});
