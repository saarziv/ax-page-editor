/**
 * `clean` turns raw HTML into the page tree. The editor and Agent View must clean identically,
 * or saved selectors stop finding their element, so the rules are a contract (plan.md §3.2).
 *
 * Pipeline:
 *   1. parse     htmlparser2 builds a DOM (forgiving, like a browser, and pure: no I/O).
 *   2. convert   DOM → draft nodes: drop junk, map whitelisted tags, unwrap the rest (convert.ts).
 *   3. tidy      prune empty nodes, merge and trim text (tidy.ts).
 *   4. ids       number the final tree (ids.ts).
 *   5. title     `<title>`, else the first heading, else the URL.
 */
import { DomUtils, parseDocument } from 'htmlparser2';
import type { PageNode, PageTree } from '../schemas.js';
import { convertChildren } from './convert.js';
import { collectLabelsByFieldId, findDocumentTitle } from './dom-text.js';
import { assignIds } from './ids.js';
import type { DraftNode } from './rules.js';
import { draftText, finishChildren } from './tidy.js';

export function clean(html: string, baseUrl: string): PageTree {
  const document = parseDocument(html);
  const labelTextById = collectLabelsByFieldId(document);

  // Fragments without a <body> are cleaned as a whole.
  const body = DomUtils.findOne((element) => element.name === 'body', document.children);
  const contentNodes = body ? body.children : document.children;

  const drafts = finishChildren(convertChildren(contentNodes, { baseUrl, labelTextById }));
  const children = assignIds(drafts, '');
  // The root isn't a selector step, so its children start every path (`main:1`).
  const root: PageNode = { id: '', kind: 'page', tag: 'body', ...(children.length > 0 ? { children } : {}) };

  const title = findDocumentTitle(document) ?? findFirstHeadingText(drafts) ?? baseUrl;
  return { url: baseUrl, title, root };
}

function findFirstHeadingText(drafts: DraftNode[]): string | undefined {
  for (const draft of drafts) {
    if (draft.kind === 'heading') return draftText(draft) || undefined;
    const nestedHeadingText = findFirstHeadingText(draft.children);
    if (nestedHeadingText) return nestedHeadingText;
  }
  return undefined;
}
