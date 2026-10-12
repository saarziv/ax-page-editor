import { normalizeUrl } from './url.js';

export const NOT_A_PAGE_REASON = "This link doesn't lead to a page.";

/**
 * Why this link can't be forwarded, or null when it leads to a page that can be fetched.
 *
 *   https://acme.com/terms          on https://acme.com/  → null
 *   https://acme.com/terms#refunds  on https://acme.com/  → null (another page)
 *   https://acme.com/#pricing       on https://acme.com/  → "This link doesn't lead to a page."
 *   mailto:hi@acme.com, tel:+123                          → "This link doesn't lead to a page."
 */
export function forwardBlockReason(href: string, pageUrl: string): string | null {
  let linkUrl: URL;
  try {
    linkUrl = new URL(href);
  } catch {
    return NOT_A_PAGE_REASON;
  }
  if (linkUrl.protocol !== 'http:' && linkUrl.protocol !== 'https:') return NOT_A_PAGE_REASON;

  // clean resolves every href against the page, so `#pricing` arrives as `https://acme.com/#pricing`.
  // It's an anchor when it has a fragment and is otherwise this page. Checked on the raw href, because
  // URL drops an empty fragment (`…/#` has hash '').
  if (href.includes('#') && normalizeUrl(href) === normalizeUrl(pageUrl)) return NOT_A_PAGE_REASON;
  return null;
}
