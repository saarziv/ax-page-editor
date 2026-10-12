import { expect, test } from './fixtures';

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
  await expect(hideSwitch).toBeEnabled();
  await expect(hideSwitch).not.toBeChecked();
  const contextBox = inspector.getByRole('textbox', { name: 'Context for AI' });
  await expect(contextBox).toBeEditable();
  await expect(contextBox).toHaveValue('');
  await expect(contextBox).toHaveAttribute('placeholder', 'What happens when someone clicks this?');
  await expect(inspector.getByRole('button', { name: 'Forward this link' })).toBeDisabled();

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

test('the Hide switch is on for a hidden container, not for the text inside it', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  const hideSwitch = inspector.getByRole('switch', { name: 'Hide from AI' });

  await page.getByRole('region', { name: 'Preview' }).getByText(/^We use cookies/).click();
  await inspector.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Sidebar' }).click();
  await hideSwitch.click();
  await expect(hideSwitch).toBeChecked();

  // The hide is on the banner, so the paragraph inside it has its own switch, still off.
  await page.getByRole('region', { name: 'Preview' }).getByText(/^We use cookies/).click();
  await expect(inspector.getByRole('heading', { name: 'Paragraph' })).toBeVisible();
  await expect(hideSwitch).not.toBeChecked();
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

test('the Hide switch adds and removes a hide in both changes lists', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  const elementChanges = page.getByRole('region', { name: 'Selected element' });
  const pageChanges = page.getByRole('region', { name: 'Changes on this page' });
  const hideSwitch = page.getByRole('switch', { name: 'Hide from AI' });
  const chart = preview.getByRole('img', { name: 'Customer growth' });

  await expect(pageChanges.getByText('No changes yet.')).toBeVisible();

  await chart.click();
  await hideSwitch.click();
  await expect(hideSwitch).toBeChecked();
  await expect(elementChanges.getByText('Hidden from AI', { exact: true })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(pageChanges.getByRole('listitem')).toHaveText(['Hidden from AI · Customer growth']);

  await chart.click();
  await hideSwitch.click();
  await expect(hideSwitch).not.toBeChecked();
  await expect(elementChanges.getByText('No changes on this element.')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(pageChanges.getByText('No changes yet.')).toBeVisible();
});

test('a hidden element is faded in place, and stays clickable', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const chart = page.getByRole('region', { name: 'Preview' }).getByRole('img', { name: 'Customer growth' });
  const chartVeil = page.locator('[data-veil-for="main:1>figure:1>image:1"]');
  const hideSwitch = page.getByRole('switch', { name: 'Hide from AI' });

  await chart.click();
  const chartRectBefore = await chart.boundingBox();
  await hideSwitch.click();
  await expect(chart).toHaveAttribute('data-hidden', 'true');
  await expect(chartVeil).toHaveText('⊘ Hidden from AI');
  // The veil floats on top, so nothing moves (K1).
  expect(await chart.boundingBox()).toEqual(chartRectBefore);

  // The veil lets the click through, so the image underneath is selected again, with its switch on (K3).
  await page.keyboard.press('Escape');
  await chart.click();
  await expect(chart).toHaveAttribute('data-selected', 'true');
  await expect(hideSwitch).toBeChecked();

  await hideSwitch.click();
  await expect(chart).not.toHaveAttribute('data-hidden');
  await expect(chartVeil).toHaveCount(0);
});

test('the Context box adds, edits and clears one note in both changes lists', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  const elementChanges = page.getByRole('region', { name: 'Selected element' });
  const pageChanges = page.getByRole('region', { name: 'Changes on this page' });
  const contextBox = page.getByRole('textbox', { name: 'Context for AI' });
  const chart = preview.getByRole('img', { name: 'Customer growth' });

  await chart.click();
  await expect(contextBox).toHaveAttribute('placeholder', 'What does this chart show?');

  // Each keystroke replaces the note, so the element keeps exactly one (K10).
  await contextBox.pressSequentially('Customer growth');
  await expect(elementChanges.getByText(/^Context:/)).toHaveText(['Context: Customer growth']);
  await contextBox.pressSequentially(' from 1,200 to 8,500');
  await expect(elementChanges.getByText(/^Context:/)).toHaveText(['Context: Customer growth from 1,200 to 8,500']);

  // The box reads the draft, so the note is back after selecting another element and returning.
  await preview.getByText('terms of service', { exact: true }).click();
  await expect(contextBox).toHaveValue('');
  await chart.click();
  await expect(contextBox).toHaveValue('Customer growth from 1,200 to 8,500');

  await page.keyboard.press('Escape');
  // The row shows the element's snippet, then the note on its own line.
  await expect(pageChanges.getByRole('listitem')).toHaveCount(1);
  await expect(pageChanges.getByText('Context · Customer growth', { exact: true })).toBeVisible();
  await expect(pageChanges.getByText('Customer growth from 1,200 to 8,500', { exact: true })).toBeVisible();

  await chart.click();
  await contextBox.clear();
  await expect(elementChanges.getByText('No changes on this element.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pageChanges.getByText('No changes yet.')).toBeVisible();
});

test('a long note stops at 300 characters, and the box scrolls instead of pushing controls away (K11)', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  const contextBox = inspector.getByRole('textbox', { name: 'Context for AI' });

  await page.getByRole('region', { name: 'Preview' }).getByRole('img', { name: 'Customer growth' }).click();
  await contextBox.fill('word '.repeat(50));
  await expect(inspector.getByText('250 / 300')).toBeVisible();

  await contextBox.fill('x'.repeat(400));
  await expect(contextBox).toHaveValue('x'.repeat(300));
  await expect(inspector.getByText('300 / 300')).toBeVisible();

  // Taller than 10 lines of text, so it scrolls inside itself and stays narrower than the inspector.
  await contextBox.fill('line\n'.repeat(20));
  const scrolls = await contextBox.evaluate((textarea) => textarea.scrollHeight > textarea.clientHeight);
  expect(scrolls).toBe(true);
  const boxRect = await contextBox.boundingBox();
  const inspectorRect = await inspector.boundingBox();
  expect(boxRect && inspectorRect && boxRect.width < inspectorRect.width).toBe(true);
  await inspector.getByRole('switch', { name: 'Hide from AI' }).click();
  await expect(inspector.getByRole('switch', { name: 'Hide from AI' })).toBeChecked();
  await inspector.getByRole('button', { name: 'Forward this link' }).scrollIntoViewIfNeeded();
  await expect(inspector.getByRole('button', { name: 'Forward this link' })).toBeInViewport();
});

// Global flow 1, in the preview: hide the banner, explain the chart.
test('a hidden banner is faded and a note on the chart shows as a callout under it (K5, K6)', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  const contextBox = inspector.getByRole('textbox', { name: 'Context for AI' });
  const chart = preview.getByRole('img', { name: 'Customer growth' });
  const callout = preview.getByRole('note');

  await preview.getByText(/^We use cookies/).click();
  await inspector.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Sidebar' }).click();
  await inspector.getByRole('switch', { name: 'Hide from AI' }).click();
  await expect(page.locator('[data-veil-for="aside:1"]')).toHaveText('⊘ Hidden from AI');

  await chart.click();
  await contextBox.fill('Customer growth from 1,200 to 8,500.');
  await expect(callout.getByText('Context for AI', { exact: true })).toBeVisible();
  await expect(callout.getByText('Customer growth from 1,200 to 8,500.', { exact: true })).toBeVisible();
  // Right under the chart, before the caption.
  const chartRect = await chart.boundingBox();
  const calloutRect = await callout.boundingBox();
  const captionRect = await preview.getByText(/^Customers per month/).boundingBox();
  expect(chartRect && calloutRect && captionRect && calloutRect.y >= chartRect.y + chartRect.height && captionRect.y >= calloutRect.y + calloutRect.height).toBe(true);

  // Clicking the callout selects the chart, and the box shows its note.
  await page.keyboard.press('Escape');
  await callout.click();
  await expect(chart).toHaveAttribute('data-selected', 'true');
  await expect(contextBox).toHaveValue('Customer growth from 1,200 to 8,500.');

  // A note on a hidden element is never read by the agent, so its callout goes away.
  await inspector.getByRole('switch', { name: 'Hide from AI' }).click();
  await expect(callout).toHaveCount(0);
  await inspector.getByRole('switch', { name: 'Hide from AI' }).click();
  await expect(callout).toHaveCount(1);

  await contextBox.clear();
  await expect(callout).toHaveCount(0);
});

test('a note on a link comes after its paragraph, and the note is shown as typed (K8, K9)', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  const note = '<script>alert(1)</script> # heading [x](y)';

  await preview.getByText('terms of service', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Context for AI' }).fill(note);

  const callout = preview.getByRole('note');
  await expect(callout.getByText('Context for AI (on "terms of service")')).toBeVisible();
  await expect(callout.getByText(note, { exact: true })).toBeVisible();
  // The sentence stays whole: the callout is the paragraph's next sibling, not inside it.
  const paragraph = preview.locator('[data-node-id="main:1>section:1>paragraph:1"]');
  await expect(paragraph).toContainText('Read our terms of service and the guide to web analytics before you subscribe.');
  await expect(paragraph.getByRole('note')).toHaveCount(0);
  await expect(paragraph.locator('xpath=following-sibling::*[1]')).toHaveAttribute('role', 'note');
});
