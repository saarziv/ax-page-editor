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
  const hideSwitch = inspector.getByRole('switch', { name: 'Hide from AI' });
  await expect(hideSwitch).toBeDisabled();
  await expect(hideSwitch).not.toBeChecked();
  for (const controlName of ['Context for AI', 'Forward this link']) {
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

test('Esc and a click on empty preview space clear the selection', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  const termsLink = preview.getByText('terms of service', { exact: true });
  const hint = page.getByText('Click an element in the preview to inspect it.');

  await termsLink.click();
  await expect(hint).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(preview.locator('[data-selected="true"]')).toHaveCount(0);
  await expect(hint).toBeVisible();

  // The far right of the preview is outside the content column, so no element covers it.
  await termsLink.click();
  const previewBox = await preview.boundingBox();
  if (!previewBox) throw new Error('The preview has no bounding box');
  await preview.click({ position: { x: previewBox.width - 10, y: previewBox.height / 2 } });
  await expect(preview.locator('[data-selected="true"]')).toHaveCount(0);
  await expect(hint).toBeVisible();
});

test('the breadcrumb shows the path and selects a container', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  const breadcrumb = inspector.getByRole('navigation', { name: 'Breadcrumb' });

  await preview.getByText('terms of service', { exact: true }).click();
  await expect(breadcrumb).toHaveText('Main content›Section›Paragraph›Link');

  await breadcrumb.getByRole('button', { name: 'Paragraph' }).click();
  const selected = preview.locator('[data-selected="true"]');
  await expect(selected).toHaveCount(1);
  await expect(selected).toHaveJSProperty('tagName', 'P');
  await expect(selected).toContainText('Read our terms of service');
  await expect(inspector.getByRole('heading', { name: 'Paragraph' })).toBeVisible();

  // Main has only the page above it, so there is nothing to climb to.
  await breadcrumb.getByRole('button', { name: 'Main content' }).click();
  await expect(inspector.getByRole('heading', { name: 'Main content' })).toBeVisible();
  await expect(breadcrumb).toBeHidden();
});

test('the Hide switch is on for an element the draft hides', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const inspector = page.getByRole('complementary', { name: 'Inspector' });

  // The demo mock hides the whole banner, so the switch is on for the banner, not its text.
  await page.getByRole('region', { name: 'Preview' }).getByText(/^We use cookies/).click();
  await inspector.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Sidebar' }).click();
  await expect(inspector.getByRole('switch', { name: 'Hide from AI' })).toBeChecked();
});

test('hovering an element outlines it and names its type', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  const hoverBox = page.getByTestId('hover-box');

  // The innermost element wins: the box sits on the link, not the paragraph around it.
  const termsLink = preview.getByText('terms of service', { exact: true });
  await termsLink.hover();
  await expect(hoverBox).toHaveText('Link');
  const linkRect = await termsLink.boundingBox();
  const boxRect = await hoverBox.boundingBox();
  expect(boxRect?.width).toBeCloseTo(linkRect?.width ?? 0, 0);

  await preview.getByRole('heading', { name: 'Analytics that scale with you' }).hover();
  await expect(hoverBox).toHaveText('Heading');

  await preview.getByRole('img', { name: 'Customer growth' }).hover();
  await expect(hoverBox).toHaveText('Image');

  // Leaving the preview hides the box.
  await page.getByLabel('Page URL').hover();
  await expect(hoverBox).toBeHidden();
});

test("the inspector lists the selected element's changes", async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  const elementChanges = page.getByRole('region', { name: 'Selected element' });

  await preview.getByRole('img', { name: 'Customer growth' }).click();
  await expect(elementChanges.getByText(/^Context: Paying customers per month in 2026/)).toBeVisible();

  await preview.getByText('terms of service', { exact: true }).click();
  await expect(elementChanges.getByText('No changes on this element.')).toBeVisible();
});

test('modified elements are marked in the preview, and stay clickable', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  const markers = page.getByTestId('modification-marker');

  await expect(markers).toHaveCount(3);
  await expect(page.locator('[data-marker-for="aside:1"]')).toHaveText('Hidden from AI');
  await expect(page.locator('[data-marker-for="main:1>figure:1>image:1"]')).toHaveText('Context');
  await expect(page.locator('[data-marker-for="main:1>section:1>paragraph:1>link:2"]')).toHaveText('Forwarded');

  // The marker lets the click through, so the image underneath gets selected.
  const chart = preview.getByRole('img', { name: 'Customer growth' });
  await chart.click();
  await expect(chart).toHaveAttribute('data-selected', 'true');
});
