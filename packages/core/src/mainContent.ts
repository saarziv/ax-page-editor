import type { PageNode } from './schemas.js';
import { nodeText } from './tree.js';

// Page chrome: what surrounds the content rather than being it (spec K4).
const CHROME_KINDS: ReadonlySet<PageNode['kind']> = new Set(['nav', 'header', 'footer', 'aside']);

/**
 * Only what a reader comes for: `main`, else the `article` with the most text, else the root,
 * without any nav, header, footer or aside inside it. A heuristic (P5), so messy pages may keep some chrome.
 *
 *   page [header, nav, main [h1, p, aside], footer]  →  main [h1, p]
 */
export function mainContent(root: PageNode): PageNode {
  const contentRoot = findFirstOfKind(root, 'main') ?? longestArticle(root) ?? root;
  return withoutChrome(contentRoot);
}

function findFirstOfKind(node: PageNode, kind: PageNode['kind']): PageNode | null {
  if (node.kind === kind) return node;
  for (const child of node.children ?? []) {
    const found = findFirstOfKind(child, kind);
    if (found) return found;
  }
  return null;
}

function longestArticle(root: PageNode): PageNode | null {
  let longest: PageNode | null = null;
  let longestLength = -1;
  for (const article of allOfKind(root, 'article')) {
    const textLength = nodeText(article).length;
    if (textLength > longestLength) {
      longest = article;
      longestLength = textLength;
    }
  }
  return longest;
}

function allOfKind(node: PageNode, kind: PageNode['kind']): PageNode[] {
  const below = (node.children ?? []).flatMap((child) => allOfKind(child, kind));
  return node.kind === kind ? [node, ...below] : below;
}

function withoutChrome(node: PageNode): PageNode {
  if (!node.children) return node;
  return { ...node, children: node.children.filter((child) => !CHROME_KINDS.has(child.kind)).map(withoutChrome) };
}
