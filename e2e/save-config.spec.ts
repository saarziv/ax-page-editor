import { expect, test } from './fixtures';

// Runs against the dev's api, so these tests save sample:demo into the dev database (feature 04 plan, Tests).
// Every test that saves sample:demo lives in this file: tests in one file run in order, files run in parallel,
// so a save from another file could land between a test's save and its check.
test('Save and "Unsaved changes" show only with unsaved changes, and a save confirms with a toast', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const saveButton = page.getByRole('button', { name: 'Save' });
  const unsavedIndicator = page.getByText('Unsaved changes', { exact: true });
  await expect(saveButton).toBeDisabled();
  await expect(unsavedIndicator).toHaveCount(0);

  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await page.getByRole('region', { name: 'Preview' }).getByText(/^We use cookies/).click();
  await inspector.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Sidebar' }).click();
  await inspector.getByRole('switch', { name: 'Hide from AI' }).click();
  await expect(saveButton).toBeEnabled();
  await expect(unsavedIndicator).toBeVisible();

  await saveButton.click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await expect(saveButton).toBeDisabled();
  await expect(unsavedIndicator).toHaveCount(0);
});

test('removing a saved change from the list un-fades it and shows "Unsaved changes"', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  const pageChanges = page.getByRole('region', { name: 'Changes on this page' });
  const saveButton = page.getByRole('button', { name: 'Save' });
  const unsavedIndicator = page.getByText('Unsaved changes', { exact: true });
  const bannerVeil = page.locator('[data-veil-for="aside:1"]');

  await page.getByRole('region', { name: 'Preview' }).getByText(/^We use cookies/).click();
  await inspector.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Sidebar' }).click();
  await inspector.getByRole('switch', { name: 'Hide from AI' }).click();
  await saveButton.click();
  await expect(unsavedIndicator).toHaveCount(0);

  await page.keyboard.press('Escape');
  await pageChanges.getByRole('button', { name: /^Remove Hidden from AI: We use cookies/ }).click();

  await expect(bannerVeil).toHaveCount(0);
  await expect(pageChanges.getByText('No changes yet.')).toBeVisible();
  await expect(unsavedIndicator).toBeVisible();
  await expect(saveButton).toBeEnabled();
});

test.describe('with the real saved configuration', () => {
  test.use({ restoreSavedChanges: true });

  // Starts from an empty demo configuration, so the Hide click below turns the hide on, never off.
  test.beforeEach(async ({ request }) => {
    await request.put('http://localhost:3001/api/configs', { data: { url: 'sample:demo', modifications: [] } });
  });

  test('a saved page is listed on the start screen, and clicking it opens the page with its saved changes', async ({ page }) => {
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
    await expect(page.locator('[data-veil-for="main:1>figure:1>image:1"]')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Changes on this page' }).getByRole('listitem')).toHaveCount(1);
    await expect(page.getByText('Unsaved changes', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
