import { expect, test } from './fixtures';

// A real tooltip, not a native `title`: those show only after a still hover, never on focus, and not at all
// in an unfocused window, so publishers didn't see them (05 T02).
test('View as agent shows a tooltip when enabled, and another while there are unsaved changes (AC10, AC11)', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const viewAsAgentButton = page.getByRole('button', { name: 'View as agent ↗' });
  const tooltip = page.getByRole('tooltip');
  await expect(viewAsAgentButton).toBeEnabled();
  await viewAsAgentButton.hover();
  await expect(tooltip).toHaveText('Opens what an AI agent gets for this page, in a new tab.');

  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await page.getByRole('region', { name: 'Preview' }).getByText(/^We use cookies/).click();
  await inspector.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Sidebar' }).click();
  await inspector.getByRole('switch', { name: 'Hide from AI' }).click();
  await expect(viewAsAgentButton).toBeDisabled();

  // A disabled button gets no mouse events, so this hovers what the publisher's mouse lands on: its wrapper.
  await viewAsAgentButton.hover({ force: true });
  await expect(tooltip).toHaveText('Save to see your latest changes as an agent.');
});
