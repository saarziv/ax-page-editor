import type { PageNode } from './schemas.js';

/**
 * The marked page without its hidden subtrees: the agent tree, the only tree the renderers see (global plan §3.4).
 * Like markModificationsInTree it never edits its input: only the nodes on the path to a removed subtree are copied.
 *
 *   page [aside (hidden), main]  →  page [main]
 */
export function prune(root: PageNode): PageNode {
  if (!root.children) return root;
  const prunedChildren = root.children.filter((child) => !child.hidden).map(prune);
  const childrenChanged =
    prunedChildren.length !== root.children.length || prunedChildren.some((child, index) => child !== root.children?.[index]);
  // A container left empty stays: it renders as nothing.
  return childrenChanged ? { ...root, children: prunedChildren } : root;
}
