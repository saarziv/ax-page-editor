import type { Modification, ModificationStatus, PageNode } from './schemas.js';
import { resolve } from './target.js';
import { findNodePath, isContainerKind } from './tree.js';

export type Marked = {
  /** The marked page: the original tree, with hidden elements flagged and still in place, and notes inserted. */
  tree: PageNode;
  status: Record<Modification['id'], ModificationStatus>;
};

type ContextModification = Extract<Modification, { type: 'context' }>;

// A note right after a link in one of these would split its sentence, so it goes after the whole block.
const SENTENCE_BLOCK_KINDS: ReadonlySet<PageNode['kind']> = new Set(['paragraph', 'heading', 'listItem', 'quote']);

/** Where one note goes: first inside `anchorId`, or right after it. */
type NotePlacement = { anchorId: string; position: 'firstInside' | 'after'; namesElement: boolean };

/**
 * Applies every modification once and returns the marked page plus a status per modification (global plan §3.4).
 * Built so far: step 1 (resolve), step 2 (hide) and step 3 (context). Forward comes with 05.
 */
export function markModificationsInTree(root: PageNode, modifications: Modification[]): Marked {
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
  }

  // Step 3: each active note becomes an annotation node, placed by its element's kind.
  const { notesFirstInside, notesAfter } = placeNotes(root, activeContexts, resolvedPaths);

  return { tree: markNode(root, activeHiddenNodeIds, notesFirstInside, notesAfter), status };
}

function placeNotes(root: PageNode, contexts: ContextModification[], resolvedPaths: Map<Modification['id'], PageNode[]>) {
  const readingOrder = readingOrderOf(root);
  const placedNotes = contexts.flatMap((context) => {
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
    return [{ placement, annotation, elementOrder: readingOrder.get(element.id) ?? 0 }];
  });

  // Two notes at one spot (a paragraph's and its link's) keep the page's reading order, so the paragraph's comes first.
  placedNotes.sort((first, second) => first.elementOrder - second.elementOrder);

  const notesFirstInside = new Map<string, PageNode[]>();
  const notesAfter = new Map<string, PageNode[]>();
  for (const { placement, annotation } of placedNotes) {
    const notesByAnchor = placement.position === 'firstInside' ? notesFirstInside : notesAfter;
    notesByAnchor.set(placement.anchorId, [...(notesByAnchor.get(placement.anchorId) ?? []), annotation]);
  }
  return { notesFirstInside, notesAfter };
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

/** Each node's position in reading order (a pre-order walk), so notes at one spot can be sorted. */
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
  notesFirstInside: Map<string, PageNode[]>,
  notesAfter: Map<string, PageNode[]>,
): PageNode {
  const markedChildren = node.children?.flatMap((child) => [
    markNode(child, hiddenNodeIds, notesFirstInside, notesAfter),
    ...(notesAfter.get(child.id) ?? []),
  ]);
  const childrenChanged =
    markedChildren !== undefined &&
    (markedChildren.length !== node.children?.length || markedChildren.some((child, index) => child !== node.children?.[index]));
  const leadingNotes = notesFirstInside.get(node.id) ?? [];
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

function textAsChildren(node: PageNode): PageNode[] {
  return node.text === undefined ? [] : [{ id: `${node.id}>text:1`, kind: 'text', tag: '#text', text: node.text }];
}
