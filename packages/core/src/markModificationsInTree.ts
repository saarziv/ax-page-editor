import type { Modification, ModificationStatus, PageNode } from './schemas.js';
import { resolve } from './target.js';
import { findNodePath } from './tree.js';

export type Marked = {
  /** The marked page: the original tree, with hidden elements flagged and still in place. */
  tree: PageNode;
  status: Record<Modification['id'], ModificationStatus>;
};

/**
 * Applies every modification once and returns the marked page plus a status per modification (global plan §3.4).
 * Built so far: step 1 (resolve) and step 2 (hide). Context and forward come later.
 */
export function markModificationsInTree(root: PageNode, modifications: Modification[]): Marked {
  const status: Marked['status'] = {};
  const resolvedNodeIds = new Map<Modification['id'], string>();

  // Step 1: a modification whose element can't be confidently found is never applied.
  for (const modification of modifications) {
    const resolvedNode = resolve(root, modification.target);
    if (resolvedNode) resolvedNodeIds.set(modification.id, resolvedNode.id);
    else status[modification.id] = 'unmatched';
  }

  // Step 2: a modification inside a hidden element is inactive, because the agent never reads it.
  const hiddenNodeIds = new Set(
    modifications.filter((modification) => modification.type === 'hide').flatMap((hide) => resolvedNodeIds.get(hide.id) ?? []),
  );
  const activeHiddenNodeIds = new Set<string>();
  for (const modification of modifications) {
    const resolvedNodeId = resolvedNodeIds.get(modification.id);
    if (resolvedNodeId === undefined) continue;
    const isInsideHidden = isInsideHiddenNode(root, resolvedNodeId, hiddenNodeIds);
    status[modification.id] = isInsideHidden ? 'inactive' : 'active';
    if (!isInsideHidden && modification.type === 'hide') activeHiddenNodeIds.add(resolvedNodeId);
  }

  return { tree: flagHiddenNodes(root, activeHiddenNodeIds), status };
}

function isInsideHiddenNode(root: PageNode, nodeId: string, hiddenNodeIds: Set<string>): boolean {
  const ancestors = findNodePath(root, nodeId)?.slice(0, -1) ?? [];
  return ancestors.some((ancestor) => hiddenNodeIds.has(ancestor.id));
}

// The page comes from the query cache and the inspector reads it too, so it is never edited:
// only the flagged nodes and their ancestors are copied, and every other node is shared.
function flagHiddenNodes(node: PageNode, hiddenNodeIds: Set<string>): PageNode {
  const children = node.children?.map((child) => flagHiddenNodes(child, hiddenNodeIds));
  const childrenChanged = children?.some((child, index) => child !== node.children?.[index]) ?? false;
  const becomesHidden = hiddenNodeIds.has(node.id) && !node.hidden;
  if (!childrenChanged && !becomesHidden) return node;
  return {
    ...node,
    ...(childrenChanged && { children }),
    ...(becomesHidden && { hidden: true as const }),
  };
}
