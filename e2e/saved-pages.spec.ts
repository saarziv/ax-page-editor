import { expect, test } from './fixtures';

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
