import { expect, test } from '@playwright/test';

test('clicking an element selects it and shows it in the inspector', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  const selected = preview.locator('[data-selected="true"]');

  // A click on the link inside a paragraph selects the link, not the paragraph.
  const termsLink = preview.getByText('terms of service', { exact: true });
  await termsLink.click();
  await expect(selected).toHaveCount(1);
  await expect(termsLink).toHaveAttribute('data-selected', 'true');
  await expect(page).toHaveURL(/localhost/);

  await expect(inspector.getByRole('heading', { name: 'Link' })).toBeVisible();
  await expect(inspector.getByText('<a>')).toBeVisible();
  await expect(inspector.getByText('terms of service', { exact: true })).toBeVisible();
  await expect(inspector.getByText('https://www.iana.org/help/example-domains')).toBeVisible();
  await expect(inspector.getByText('No changes on this element.')).toBeVisible();
  for (const controlName of ['Hide from AI', 'Context for AI', 'Forward this link']) {
    await expect(inspector.getByRole('button', { name: controlName })).toBeDisabled();
  }

  // The selection moves to the next element clicked.
  const heading = preview.getByRole('heading', { name: 'Analytics that scale with you' });
  await heading.click();
  await expect(selected).toHaveCount(1);
  await expect(heading).toHaveAttribute('data-selected', 'true');
  await expect(inspector.getByRole('heading', { name: 'Heading' })).toBeVisible();
});

// The demo is the only page available offline, so this reopens it; setUrl clears the selection either way.
test('opening a page from the top bar clears the selection', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();
  await page.getByRole('region', { name: 'Preview' }).getByText('terms of service', { exact: true }).click();

  await page.getByRole('button', { name: 'Open', exact: true }).click();

  await expect(page.getByText('Click an element in the preview to inspect it.')).toBeVisible();
});
