import { expect, test } from './fixtures';

// The sample is loaded from disk, so these tests never depend on the internet.
test('typing a URL and clicking Open shows the page in the editor', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Page URL').fill('sample:demo');
  await page.getByRole('button', { name: 'Open', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Analytics that scale with you' })).toBeVisible();
  await expect(page.getByText('sample:demo', { exact: true })).toBeVisible();
});

test('the editor shows the top bar, preview and the inspector with no changes yet', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Page URL').fill('sample:demo');
  await page.getByRole('button', { name: 'Open', exact: true }).click();

  await expect(page.getByLabel('Page URL')).toHaveValue('sample:demo');
  await expect(page.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Preview' })).toBeVisible();

  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector.getByText('Click an element in the preview to inspect it.')).toBeVisible();
  const pageChanges = inspector.getByRole('region', { name: 'Changes on this page' });
  await expect(pageChanges.getByText('No changes yet.')).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Hide from AI' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Context for AI' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Forward this link' })).toHaveCount(0);
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

// localhost is blocked by the api, so this needs no network.
test('opening another page clears the changes', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();
  await page.getByRole('region', { name: 'Preview' }).getByRole('img', { name: 'Customer growth' }).click();
  await page.getByRole('switch', { name: 'Hide from AI' }).click();
  await page.keyboard.press('Escape');
  const pageChanges = page.getByRole('region', { name: 'Changes on this page' });
  await expect(pageChanges.getByRole('listitem')).toHaveCount(1);

  await page.getByLabel('Page URL').fill('http://localhost:3001');
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  // The editor shows its loading state until the page tree query gives up after its retries.
  await expect(pageChanges.getByText('No changes yet.')).toBeVisible({ timeout: 15_000 });
});
