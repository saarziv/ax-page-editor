import { expect, test } from '@playwright/test';

// Runs against the dev's api, so this saves sample:demo into the dev database (feature 04 plan, Tests).
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
