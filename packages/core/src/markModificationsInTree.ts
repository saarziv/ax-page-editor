import type { FetchErrorCode, Modification, ModificationStatus, PageNode, PageTree } from './schemas.js';
import { resolve } from './target.js';
import { findNodePath, isContainerKind, textAsChildren } from './tree.js';
import { truncateTree } from './truncateTree.js';

export type Marked = {
  /** The marked page: the original tree, with hidden elements flagged and still in place, and notes and forwards inserted. */
  tree: PageNode;
  status: Record<Modification['id'], ModificationStatus>;
};

/** One forwarded page, by its `href`. With neither `tree` nor `error` it's still loading. */
export type Forwarded = { href: string; tree?: PageTree; error?: FetchErrorCode };

// About 3,000 tokens, at the 4 characters per token `estimateTokens` counts (P9).
const FORWARDED_CONTENT_MAX_CHARS = 12_000;

type ContextModification = Extract<Modification, { type: 'context' }>;
type ForwardModification = Extract<Modification, { type: 'forward' }>;

// A note right after a link in one of these would split its sentence, so it goes after the whole block.
const SENTENCE_BLOCK_KINDS: ReadonlySet<PageNode['kind']> = new Set(['paragraph', 'heading', 'listItem', 'quote']);

/** Where one note or forward goes: first inside `anchorId`, or right after it. */
type NotePlacement = { anchorId: string; position: 'firstInside' | 'after'; namesElement: boolean };

/**
 * Applies every modification once and returns the marked page plus a status per modification (global plan §3.4).
 * `forwards` holds the fetched pages by `href`; a forward whose page isn't in it yet is still loading.
 */
export function markModificationsInTree(
  root: PageNode,
  modifications: Modification[],
  forwards: ReadonlyMap<string, Forwarded> = new Map(),
): Marked {
  const status: Marked['status'] = {};
  // From the root down to the resolved element. Every target is resolved on the original page, before any insertion.
  const resolvedPaths = new Map<Modification['id'], PageNode[]>();

  // Step 1: a modification whose element can't be confidently found is never applied.
  for (const modification of modifications) {
    const resolvedNode = resolve(root, modification.target);
    const resolvedPath = resolvedNode && findNodePath(root, resolvedNode.id);
    if (resolvedPath) resolvedPaths.set(modification.id, resolvedPath);
    else status[modification.id] = 'unmatched';
  }

  // Step 2: anything the agent never reads is inactive. For a hide, that's inside a hidden element.
  // A note on the hidden element itself would be placed outside it, about something that isn't there, so it is inactive too.
  const hiddenNodeIds = new Set(
    modifications.filter((modification) => modification.type === 'hide').flatMap((hide) => resolvedPaths.get(hide.id)?.at(-1)?.id ?? []),
  );
  const activeHiddenNodeIds = new Set<string>();
  const activeContexts: ContextModification[] = [];
  const activeForwards: ForwardModification[] = [];
  for (const modification of modifications) {
    const resolvedPath = resolvedPaths.get(modification.id);
    const element = resolvedPath?.at(-1);
    if (!resolvedPath || !element) continue;
    const ancestors = resolvedPath.slice(0, -1);
    const pathCheckedForHidden = modification.type === 'hide' ? ancestors : resolvedPath;
    const isInactive = pathCheckedForHidden.some((node) => hiddenNodeIds.has(node.id));
    status[modification.id] = isInactive ? 'inactive' : 'active';
    if (isInactive) continue;
    if (modification.type === 'hide') activeHiddenNodeIds.add(element.id);
    if (modification.type === 'context') activeContexts.push(modification);
    if (modification.type === 'forward') activeForwards.push(modification);
  }

  // Steps 3 and 4: each active note becomes an annotation node and each active forward a forwarded node,
  // both placed by the same rule.
  const insertedNodes = [
    ...activeContexts.flatMap((context) => annotationFor(context, resolvedPaths)),
    ...activeForwards.flatMap((forward) => forwardedNodeFor(forward, resolvedPaths, forwards)),
  ];
  for (const forward of activeForwards) {
    if (forwards.get(forward.href)?.error) status[forward.id] = 'failed';
  }
  const { insertedFirstInside, insertedAfter } = groupByPlacement(root, insertedNodes);

  return { tree: markNode(root, activeHiddenNodeIds, insertedFirstInside, insertedAfter), status };
}

/** A note or forward to insert, the element it belongs to, and where it goes. */
type InsertedNode = { node: PageNode; element: PageNode; placement: NotePlacement };

function annotationFor(context: ContextModification, resolvedPaths: Map<Modification['id'], PageNode[]>): InsertedNode[] {
  const resolvedPath = resolvedPaths.get(context.id);
  const element = resolvedPath?.at(-1);
  if (!resolvedPath || !element) return [];
  const placement = notePlacementFor(resolvedPath);
  const annotation: PageNode = {
    id: `context:${context.id}`,
    kind: 'annotation',
    tag: 'aside',
    text: context.note,
    attrs: { forId: element.id, ...(placement.namesElement && { about: context.target.text }) },
  };
  return [{ node: annotation, element, placement }];
}

function forwardedNodeFor(
  forward: ForwardModification,
  resolvedPaths: Map<Modification['id'], PageNode[]>,
  forwards: ReadonlyMap<string, Forwarded>,
): InsertedNode[] {
  const resolvedPath = resolvedPaths.get(forward.id);
  const element = resolvedPath?.at(-1);
  if (!resolvedPath || !element) return [];
  const id = `forward:${forward.id}`;
  const forwarded = forwards.get(forward.href);
  const attrs = { forId: element.id, href: forward.href };
  let node: PageNode;
  if (forwarded?.error) {
    node = { id, kind: 'forwarded', tag: 'section', attrs: { ...attrs, forwardState: 'failed', errorCode: forwarded.error } };
  } else if (forwarded?.tree) {
    // Cut here, not in the api, so the preview and Agent View end at the same word (K6).
    const contentRoot = truncateTree(forwarded.tree.root, FORWARDED_CONTENT_MAX_CHARS);
    const content = contentRoot.children ?? textAsChildren(contentRoot);
    node = {
      id,
      kind: 'forwarded',
      tag: 'section',
      attrs: { ...attrs, forwardState: 'loaded' },
      children: content.map((child) => withIdPrefix(child, `${id}>`)),
    };
  } else {
    node = { id, kind: 'forwarded', tag: 'section', attrs: { ...attrs, forwardState: 'loading' } };
  }
  return [{ node, element, placement: notePlacementFor(resolvedPath) }];
}

// Targets resolve only against the original page, and no selector starts with `forward:`, so nothing inside forwarded
// content can be hidden, noted or forwarded again (K5). The prefix also keeps its ids from colliding with the page's.
function withIdPrefix(node: PageNode, prefix: string): PageNode {
  return { ...node, id: prefix + node.id, ...(node.children && { children: node.children.map((child) => withIdPrefix(child, prefix)) }) };
}

function groupByPlacement(root: PageNode, insertedNodes: InsertedNode[]) {
  const readingOrder = readingOrderOf(root);
  // Two notes at one spot (a paragraph's and its link's) keep the page's reading order, so the paragraph's comes first.
  // On one element, the note comes before the forward, because it frames what follows.
  const kindOrder = (inserted: InsertedNode) => (inserted.node.kind === 'annotation' ? 0 : 1);
  const sortedNodes = [...insertedNodes].sort(
    (first, second) =>
      (readingOrder.get(first.element.id) ?? 0) - (readingOrder.get(second.element.id) ?? 0) || kindOrder(first) - kindOrder(second),
  );

  const insertedFirstInside = new Map<string, PageNode[]>();
  const insertedAfter = new Map<string, PageNode[]>();
  for (const { placement, node } of sortedNodes) {
    const insertedByAnchor = placement.position === 'firstInside' ? insertedFirstInside : insertedAfter;
    insertedByAnchor.set(placement.anchorId, [...(insertedByAnchor.get(placement.anchorId) ?? []), node]);
  }
  return { insertedFirstInside, insertedAfter };
}

// Spec §3, why in D7: a container's note frames what follows, anything else's explains what was just read.
function notePlacementFor(resolvedPath: PageNode[]): NotePlacement {
  const element = resolvedPath[resolvedPath.length - 1] as PageNode;
  const innermostAncestorsFirst = resolvedPath.slice(0, -1).reverse();

  // A note after a row or a cell would break the table.
  const enclosingTable = innermostAncestorsFirst.find((ancestor) => ancestor.kind === 'table');
  if (enclosingTable) return { anchorId: enclosingTable.id, position: 'after', namesElement: true };

  const enclosingSentence = element.kind === 'link' && innermostAncestorsFirst.find((ancestor) => SENTENCE_BLOCK_KINDS.has(ancestor.kind));
  if (enclosingSentence) return { anchorId: enclosingSentence.id, position: 'after', namesElement: true };

  return { anchorId: element.id, position: isContainerKind(element.kind) ? 'firstInside' : 'after', namesElement: false };
}

/** Each node's position in reading order (a pre-order walk), so notes and forwards at one spot can be sorted. */
function readingOrderOf(root: PageNode): Map<string, number> {
  const readingOrder = new Map<string, number>();
  const visit = (node: PageNode) => {
    readingOrder.set(node.id, readingOrder.size);
    node.children?.forEach(visit);
  };
  visit(root);
  return readingOrder;
}

// The page comes from the query cache and the inspector reads it too, so it is never edited:
// only the nodes that change (flagged, or given a new child) and their ancestors are copied, and every other node is shared.
function markNode(
  node: PageNode,
  hiddenNodeIds: Set<string>,
  insertedFirstInside: Map<string, PageNode[]>,
  insertedAfter: Map<string, PageNode[]>,
): PageNode {
  const markedChildren = node.children?.flatMap((child) => [
    markNode(child, hiddenNodeIds, insertedFirstInside, insertedAfter),
    ...(insertedAfter.get(child.id) ?? []),
  ]);
  const childrenChanged =
    markedChildren !== undefined &&
    (markedChildren.length !== node.children?.length || markedChildren.some((child, index) => child !== node.children?.[index]));
  const leadingNotes = insertedFirstInside.get(node.id) ?? [];
  const becomesHidden = hiddenNodeIds.has(node.id) && !node.hidden;
  if (!childrenChanged && leadingNotes.length === 0 && !becomesHidden) return node;

  const markedNode: PageNode = { ...node, ...(becomesHidden && { hidden: true as const }) };
  if (childrenChanged) markedNode.children = markedChildren;
  if (leadingNotes.length > 0) {
    // A container that holds only text keeps it in `text`. It becomes a text child so the note can come before it.
    markedNode.children = [...leadingNotes, ...(markedNode.children ?? textAsChildren(node))];
    delete markedNode.text;
  }
  return markedNode;
}

