export class InvalidUrlError extends Error {
  constructor(rawUrl: string) {
    super(`Not a valid http(s) URL: ${JSON.stringify(rawUrl)}`);
    this.name = 'InvalidUrlError';
  }
}

// No dots allowed, so `example.com:8080` reads as a host with a port, not as a scheme.
const SCHEME_PREFIX = /^[a-z][a-z0-9+-]*:/i;

// Tracking params only say where the click came from; the page is the same. If we kept them,
// every campaign link would become its own page with its own configuration.
const TRACKING_PARAMS = new Set(['fbclid', 'gclid']);

function isTrackingParam(name: string): boolean {
  return name.startsWith('utm_') || TRACKING_PARAMS.has(name);
}

/**
 * Canonical form of a page URL. Configurations are stored per URL, so two URLs that show the
 * same page must normalize to the same string, or the publisher's changes won't be found.
 *
 *   example.com/page/?utm_source=x           → https://example.com/page
 *   HTTPS://Example.COM/About#team           → https://example.com/About
 *   https://shop.com/list?page=2&sort=price  → https://shop.com/list?page=2&sort=price
 *   https://shop.com/list?sort=price&page=2  → https://shop.com/list?page=2&sort=price
 *   https://example.com                      → https://example.com/
 *   sample:demo                              → sample:demo
 *   ftp://x, javascript:alert(1), ""         → throws InvalidUrlError
 *
 * Deliberately kept apart (they can be different pages):
 * - http vs https, and www vs no www: a site may serve different content on each.
 * - Path case (`/About` vs `/about`): paths are case-sensitive on most servers.
 * - Non-tracking params (`?id=7`, `?page=2`): they usually change what the page shows.
 */
export function normalizeUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim();
  // The bundled demo is loaded from disk, not fetched, so it isn't a web URL to canonicalize.
  if (trimmedUrl.startsWith('sample:')) return trimmedUrl;

  // People type `example.com`, not `https://example.com`. https is the safe default today.
  const withScheme = SCHEME_PREFIX.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
  let url: URL;
  try {
    // The URL parser also lowercases the scheme and host (hosts are case-insensitive)
    // and drops default ports (`:443` on https).
    url = new URL(withScheme);
  } catch {
    throw new InvalidUrlError(rawUrl);
  }
  // Only web pages can be opened. This also rejects `javascript:`, `file:`, `mailto:` and the like.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InvalidUrlError(rawUrl);
  }

  // The fragment never reaches the server: `#top` and `#team` are the same page.
  url.hash = '';
  // Copy the keys first: deleting while iterating searchParams skips entries.
  for (const name of [...url.searchParams.keys()]) {
    if (isTrackingParam(name)) url.searchParams.delete(name);
  }
  // Param order doesn't change the page, so `?b=2&a=1` and `?a=1&b=2` share one configuration.
  url.searchParams.sort();
  // `/page/` and `/page` are the same page on almost every site. The root keeps its `/`
  // because the URL serializer always writes an empty path as `/`.
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }
  return url.toString();
}
