import { expect, test } from '@playwright/test';

// Runs against the dev's api, so this saves sample:demo into the dev database (feature 04 plan, Tests).
test('Save is enabled only with unsaved changes, and confirms with a toast', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const saveButton = page.getByRole('button', { name: 'Save' });
  await expect(saveButton).toBeDisabled();

  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await page.getByRole('region', { name: 'Preview' }).getByText(/^We use cookies/).click();
  await inspector.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Sidebar' }).click();
  await inspector.getByRole('switch', { name: 'Hide from AI' }).click();
  await expect(saveButton).toBeEnabled();

  await saveButton.click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await expect(saveButton).toBeDisabled();
});
