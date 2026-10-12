import type { PageNode } from './schemas.js';

// Elements that hold other content. A note on one comes first inside it, framing what follows (spec §3, D7).
const CONTAINER_KINDS: ReadonlySet<PageNode['kind']> = new Set([
  'section', 'article', 'nav', 'header', 'footer', 'aside', 'main', 'list', 'table', 'form', 'figure',
]);

export function isContainerKind(kind: PageNode['kind']): boolean {
  return CONTAINER_KINDS.has(kind);
}

/** The nodes from the root down to the node with `id` (the node itself last), or null when it isn't in the tree. */
export function findNodePath(root: PageNode, id: string): PageNode[] | null {
  if (root.id === id) return [root];
  for (const child of root.children ?? []) {
    const pathFromChild = findNodePath(child, id);
    if (pathFromChild) return [root, ...pathFromChild];
  }
  return null;
}

/** All the text in a node and below it, in reading order, with whitespace collapsed. */
export function nodeText(node: PageNode): string {
  return collectText(node).replace(/\s+/g, ' ').trim();
}

// clean keeps the spaces between a text and its neighbouring link, so plain concatenation reads correctly.
function collectText(node: PageNode): string {
  return (node.text ?? '') + (node.children ?? []).map(collectText).join('');
}
