import { expect, test } from '@playwright/test';

test('typing a URL and clicking Open shows the stub editor', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Page URL').fill('https://example.com/page');
  await page.getByRole('button', { name: 'Open', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Stub page' })).toBeVisible();
  await expect(page.getByText('https://example.com/page', { exact: true })).toBeVisible();
});

test('the editor shows the top bar, preview and disabled modification controls', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Page URL').fill('https://example.com/page');
  await page.getByRole('button', { name: 'Open', exact: true }).click();

  await expect(page.getByLabel('Page URL')).toHaveValue('https://example.com/page');
  await expect(page.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Preview' })).toBeVisible();
  for (const controlName of ['Hide from AI', 'Context for AI', 'Forward this link']) {
    await expect(page.getByRole('button', { name: controlName })).toBeDisabled();
  }
});
