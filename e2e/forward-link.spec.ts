import { expect, test } from './fixtures';

const TERMS_HREF = 'https://www.iana.org/help/example-domains';

test('the Forward to AI switch shows on links only, disabled with its reason for a non-page link (K1, K9)', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  const forwardSwitch = inspector.getByRole('switch', { name: 'Forward to AI' });
  const tooltip = page.getByRole('tooltip');

  await preview.getByRole('img', { name: 'Customer growth' }).click();
  await expect(inspector.getByRole('switch', { name: 'Hide from AI' })).toBeVisible();
  await expect(forwardSwitch).toHaveCount(0);

  await preview.getByText('terms of service', { exact: true }).click();
  await expect(forwardSwitch).toBeEnabled();
  await expect(forwardSwitch).not.toBeChecked();
  await forwardSwitch.hover();
  await expect(tooltip).toHaveText(
    "AI agents get the main content of the linked page, right after this link. Useful because most agents don't follow links.",
  );

  await preview.getByText('Email us', { exact: true }).click();
  await expect(forwardSwitch).toBeDisabled();
  // A disabled switch gets no mouse events, so this hovers its wrapper, where the publisher's mouse lands.
  await forwardSwitch.hover({ force: true });
  await expect(tooltip).toHaveText("This link doesn't lead to a page.");
});

test('turning Forward on adds the forward to the changes, and off removes it (K8)', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  const forwardSwitch = inspector.getByRole('switch', { name: 'Forward to AI' });
  const elementChanges = inspector.getByText(`Forwarded: ${TERMS_HREF}`);
  const saveButton = page.getByRole('button', { name: 'Save' });

  await page.getByRole('region', { name: 'Preview' }).getByText('terms of service', { exact: true }).click();
  await forwardSwitch.click();
  await expect(forwardSwitch).toBeChecked();
  await expect(elementChanges).toBeVisible();
  await expect(saveButton).toBeEnabled();

  await forwardSwitch.click();
  await expect(forwardSwitch).not.toBeChecked();
  await expect(elementChanges).toHaveCount(0);
  await expect(saveButton).toBeDisabled();
});
