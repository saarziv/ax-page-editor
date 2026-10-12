import type { PageNode } from './schemas.js';

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
