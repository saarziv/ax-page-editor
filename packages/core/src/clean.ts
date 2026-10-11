import type { PageTree } from './schemas.js';

/** Turns raw HTML into a page tree. Stub until T06. */
export function clean(html: string, baseUrl: string): PageTree {
  throw new Error(`clean is not implemented (baseUrl: ${baseUrl}, html length: ${html.length})`);
}
