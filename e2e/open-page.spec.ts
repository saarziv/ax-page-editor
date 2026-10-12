import { expect, test } from '@playwright/test';

// The sample is loaded from disk, so these tests never depend on the internet.
test('typing a URL and clicking Open shows the page in the editor', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Page URL').fill('sample:demo');
  await page.getByRole('button', { name: 'Open', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Analytics that scale with you' })).toBeVisible();
  await expect(page.getByText('sample:demo', { exact: true })).toBeVisible();
});

test('the editor shows the top bar, preview and the inspector with the demo changes', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Page URL').fill('sample:demo');
  await page.getByRole('button', { name: 'Open', exact: true }).click();

  await expect(page.getByLabel('Page URL')).toHaveValue('sample:demo');
  await expect(page.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Preview' })).toBeVisible();

  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector.getByText('Click an element in the preview to inspect it.')).toBeVisible();
  const pageChanges = inspector.getByRole('region', { name: 'Changes on this page' });
  // The demo opens with the mock modifications until 03 adds real controls.
  await expect(pageChanges.getByRole('listitem')).toHaveText([
    'Hidden from AI · We use cookies to improve your experience. By continuing you',
    'Context · Customer growth',
    'Forwarded · guide to web analytics',
  ]);
  for (const controlName of ['Hide from AI', 'Context for AI', 'Forward this link']) {
    await expect(page.getByRole('button', { name: controlName })).toHaveCount(0);
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

// The mock belongs to the demo only. localhost is blocked by the api, so this needs no network.
test('opening another page clears the demo changes, and reopening the demo restores them', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();
  const pageChanges = page.getByRole('region', { name: 'Changes on this page' });
  await expect(pageChanges.getByRole('listitem')).toHaveCount(3);

  await page.getByLabel('Page URL').fill('http://localhost:3001');
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(pageChanges.getByText('No changes yet.')).toBeVisible();

  await page.getByLabel('Page URL').fill('sample:demo');
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(pageChanges.getByRole('listitem')).toHaveCount(3);
});
