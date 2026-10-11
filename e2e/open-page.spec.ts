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

test('the sample page renders as a clean document, with no scripts or hidden fields', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  await expect(preview.getByRole('heading', { name: 'Analytics that scale with you' })).toBeVisible();
  await expect(preview.getByRole('table')).toBeVisible();
  await expect(preview.getByRole('row')).toHaveCount(3);
  await expect(preview).not.toContainText('acceptCookies');
  await expect(preview).not.toContainText('dataLayer');
  await expect(preview.locator('[value="do-not-show"]')).toHaveCount(0);
  await expect(preview).not.toContainText('do-not-show');
});
