/** Turns `href` / `src` attributes into absolute URLs, or `undefined` when there's nothing usable. */

export function resolveUrl(rawUrl: string | undefined, baseUrl: string): string | undefined {
  if (rawUrl === undefined) return undefined;
  try {
    return new URL(rawUrl.trim(), baseUrl).toString();
  } catch {
    // Relative URLs can't resolve against `sample:` bases; the node is treated as having none.
    return undefined;
  }
}

export function resolveHref(rawHref: string | undefined, baseUrl: string): string | undefined {
  const href = resolveUrl(rawHref, baseUrl);
  // Code disguised as a link: never hand it to a renderer or an agent.
  if (href === undefined || new URL(href).protocol === 'javascript:') return undefined;
  return href;
}
