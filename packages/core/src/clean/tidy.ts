/**
 * Step 2 of `clean`: tidy the draft tree bottom-up. Unwrapping leaves behind empty elements and
 * scattered text pieces; this prunes the empties and turns the text into what a reader would see.
 */
import { textDraft } from './convert.js';
import { collapseWhitespace } from './dom-text.js';
import { KINDS_KEPT_WHEN_EMPTY, type DraftNode } from './rules.js';

/** Finishes each child first, so a parent decides on its children's final shape. */
export function finishChildren(drafts: DraftNode[]): DraftNode[] {
  const nonEmptyChildren = drafts.map(finishNode).filter((draft) => !isEmpty(draft));
  return trimTextAtEdges(mergeAdjacentText(nonEmptyChildren));
}

function finishNode(draft: DraftNode): DraftNode {
  if (draft.kind === 'text') return draft;
  const children = finishChildren(draft.children);
  const onlyChild = children[0];
  // An element holding nothing but text keeps it as its own `text`: `<p>Hi</p>` is one node, not two.
  if (children.length === 1 && onlyChild?.kind === 'text') {
    return { ...draft, text: onlyChild.text, children: [] };
  }
  return { ...draft, children };
}

function isEmpty(draft: DraftNode): boolean {
  if (KINDS_KEPT_WHEN_EMPTY.has(draft.kind)) return false;
  // Blank text is dropped later by trimTextAtEdges, once neighbouring text has been merged into it.
  if (draft.kind === 'text') return false;
  return !draft.text && draft.children.length === 0;
}

/** `Hello <span>big</span> world` unwraps into three text pieces; a reader sees one. */
function mergeAdjacentText(drafts: DraftNode[]): DraftNode[] {
  const mergedDrafts: DraftNode[] = [];
  for (const draft of drafts) {
    const previous = mergedDrafts.at(-1);
    if (draft.kind === 'text' && previous?.kind === 'text') {
      mergedDrafts[mergedDrafts.length - 1] = textDraft(`${previous.text ?? ''}${draft.text ?? ''}`);
    } else {
      mergedDrafts.push(draft);
    }
  }
  return mergedDrafts;
}

/**
 * Collapses whitespace like a browser does, trims it at the element's edges (but not between
 * text and an inline link), and drops text left blank, like the gaps between block elements.
 */
function trimTextAtEdges(drafts: DraftNode[]): DraftNode[] {
  const lastIndex = drafts.length - 1;
  return drafts
    .map((draft, index) => {
      if (draft.kind !== 'text') return draft;
      let text = collapseWhitespace(draft.text ?? '');
      if (index === 0) text = text.trimStart();
      if (index === lastIndex) text = text.trimEnd();
      return textDraft(text);
    })
    .filter((draft) => draft.kind !== 'text' || (draft.text ?? '').trim() !== '');
}

/** All the text inside a draft, as one normalized string. */
export function draftText(draft: DraftNode): string {
  return collapseWhitespace([draft.text ?? '', ...draft.children.map(draftText)].join('')).trim();
}
