import type { PageNode } from './schemas.js';
import { textAsChildren } from './tree.js';

/**
 * Cuts a tree to `maxChars` characters of text, in reading order (06 plan, `truncateTree`). Nodes are kept whole
 * while they fit, the text where the limit runs out is cut at its last space, everything after is dropped, and
 * "(truncated)" ends the tree. A tree within the limit comes back as is.
 *
 *   main [p "One two three.", p "Four five six seven."], 27  →  main [p "One two three.", p "Four five six", p "(truncated)"]
 */
export function truncateTree(root: PageNode, maxChars: number): PageNode {
  if (textLength(root) <= maxChars) return root;

  const budget = { charsLeft: maxChars, cutDone: false };
  const kept = keepWithinBudget(root, budget) ?? { ...root, children: [] };
  const truncatedMarker: PageNode = { id: `${root.id}>truncated`, kind: 'paragraph', tag: 'p', text: '(truncated)' };
  // A root that kept only text holds it in `text`, which reads before any children, so it becomes a child first.
  const truncatedRoot: PageNode = { ...kept, children: [...(kept.children ?? textAsChildren(kept)), truncatedMarker] };
  delete truncatedRoot.text;
  return truncatedRoot;
}

type Budget = { charsLeft: number; cutDone: boolean };

// Returns null for a node that is dropped: after the cut, or a container the cut left empty.
function keepWithinBudget(node: PageNode, budget: Budget): PageNode | null {
  if (budget.cutDone) return null;
  const nodeLength = textLength(node);
  if (nodeLength <= budget.charsLeft) {
    budget.charsLeft -= nodeLength;
    return node;
  }

  // The limit runs out inside this node. Its own text reads before its children (see `nodeText`).
  let keptText = node.text;
  if (node.text !== undefined) {
    if (node.text.length <= budget.charsLeft) budget.charsLeft -= node.text.length;
    else {
      keptText = cutAtWordBoundary(node.text, budget.charsLeft);
      budget.cutDone = true;
    }
  }
  const keptChildren = node.children?.flatMap((child) => keepWithinBudget(child, budget) ?? []);

  const hasText = keptText !== undefined && keptText !== '';
  if (!hasText && !keptChildren?.length) return null;
  const keptNode: PageNode = { ...node, text: keptText, children: keptChildren };
  if (!hasText) delete keptNode.text;
  if (!keptChildren?.length) delete keptNode.children;
  return keptNode;
}

// Never ends mid-word: a word the limit falls inside is dropped whole.
function cutAtWordBoundary(text: string, maxChars: number): string {
  const endsOnWordBoundary = text[maxChars] === ' ';
  const withinLimit = text.slice(0, maxChars);
  const lastSpace = withinLimit.lastIndexOf(' ');
  if (endsOnWordBoundary) return withinLimit.trimEnd();
  return lastSpace === -1 ? '' : withinLimit.slice(0, lastSpace).trimEnd();
}

function textLength(node: PageNode): number {
  return (node.text?.length ?? 0) + (node.children ?? []).reduce((sum, child) => sum + textLength(child), 0);
}
