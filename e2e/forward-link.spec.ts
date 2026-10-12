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

// A small linked page with a link inside, so the test never depends on the real site.
const forwardedTermsPage = {
  url: TERMS_HREF,
  title: 'Example Domains',
  root: {
    id: 'main:1',
    kind: 'main',
    tag: 'main',
    children: [
      { id: 'main:1>heading:1', kind: 'heading', tag: 'h1', text: 'Example Domains', attrs: { level: 1 } },
      {
        id: 'main:1>paragraph:1',
        kind: 'paragraph',
        tag: 'p',
        children: [
          { id: 'main:1>paragraph:1>text:1', kind: 'text', tag: '#text', text: 'As described in ' },
          { id: 'main:1>paragraph:1>link:1', kind: 'link', tag: 'a', text: 'RFC 2606', attrs: { href: 'https://www.rfc-editor.org/rfc/rfc2606' } },
        ],
      },
    ],
  },
};

test('a forwarded link shows its page collapsed after the paragraph, and nothing inside it can be selected (K2, K5)', async ({ page }) => {
  await page.route('**/api/forward', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(forwardedTermsPage) }));
  await page.goto('/');
  await page.getByText('Try a sample').click();

  const preview = page.getByRole('region', { name: 'Preview' });
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  const termsLink = preview.getByText('terms of service', { exact: true });
  const forwardedLabel = preview.getByRole('button', { name: `Forwarded from ${TERMS_HREF}` });
  const forwardedHeading = preview.getByRole('heading', { name: 'Example Domains' });

  await termsLink.click();
  await inspector.getByRole('switch', { name: 'Forward to AI' }).click();

  // Collapsed, and after the whole paragraph rather than inside its sentence.
  await expect(forwardedLabel).toBeVisible();
  await expect(forwardedLabel).toHaveAttribute('aria-expanded', 'false');
  await expect(forwardedHeading).toHaveCount(0);
  await expect(preview.locator('p', { hasText: 'Read our terms of service' }).locator('[data-callout-for]')).toHaveCount(0);

  // Clicking the label expands it, and selects the forwarded link.
  await preview.getByRole('heading', { name: 'Analytics that scale with you' }).click();
  await forwardedLabel.click();
  await expect(forwardedLabel).toHaveAttribute('aria-expanded', 'true');
  await expect(forwardedHeading).toBeVisible();
  await expect(termsLink).toHaveAttribute('data-selected', 'true');

  // Forwarded content is read-only: no outline on hover, and a click on its link keeps the forwarded link selected.
  const forwardedContentLink = preview.getByText('RFC 2606', { exact: true });
  await forwardedContentLink.hover();
  await expect(page.getByTestId('hover-box')).toHaveCount(0);
  await forwardedContentLink.click();
  await expect(termsLink).toHaveAttribute('data-selected', 'true');
  await expect(inspector.getByText('terms of service', { exact: true })).toBeVisible();
  await expect(preview.locator('[data-selected="true"]')).toHaveCount(1);
});
