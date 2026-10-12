import { expect, test } from '@playwright/test';

// Runs against the dev's api, so this saves sample:demo into the dev database (feature 04 plan, Tests).
test('saving the demo page confirms it was saved', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await page.getByRole('region', { name: 'Preview' }).getByText(/^We use cookies/).click();
  await inspector.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Sidebar' }).click();
  await inspector.getByRole('switch', { name: 'Hide from AI' }).click();

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
});
