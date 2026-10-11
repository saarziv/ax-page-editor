/**
 * Step 3 of `clean`: give every node its id, which is also its selector (plan.md §3.3).
 * Runs last, over the final tree, so unwrapping and pruning can never shift an `nth`.
 */
import type { PageNode } from '../schemas.js';
import type { DraftNode, NodeKind } from './rules.js';

/** Ids are `kind:nth` steps joined by `>`, nth counted among same-kind siblings: `main:1>paragraph:2`. */
export function assignIds(drafts: DraftNode[], parentId: string): PageNode[] {
  const countByKind = new Map<NodeKind, number>();
  return drafts.map((draft) => {
    const nth = (countByKind.get(draft.kind) ?? 0) + 1;
    countByKind.set(draft.kind, nth);
    const step = `${draft.kind}:${nth}`;
    const id = parentId ? `${parentId}>${step}` : step;
    return toPageNode(draft, id);
  });
}

/** Optional fields are left out rather than set to `undefined`, so the JSON stays minimal. */
function toPageNode(draft: DraftNode, id: string): PageNode {
  const pageNode: PageNode = { id, kind: draft.kind, tag: draft.tag };
  if (draft.text) pageNode.text = draft.text;
  if (draft.attrs) pageNode.attrs = draft.attrs;
  const children = assignIds(draft.children, id);
  if (children.length > 0) pageNode.children = children;
  return pageNode;
}
