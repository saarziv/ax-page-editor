/**
 * The tag rules of `clean`, in one place so they can be checked against plan.md §3.2 at a glance.
 * They're a contract: change one and every saved selector built on the old tree may break.
 */
import type { PageNode } from '../schemas.js';

export type NodeKind = PageNode['kind'];
export type NodeAttrs = NonNullable<PageNode['attrs']>;

/**
 * A node before it gets an id. Ids are assigned only after pruning, so that removing an empty
 * sibling can never shift another node's `nth`.
 */
export type DraftNode = {
  kind: NodeKind;
  tag: string;
  text?: string;
  attrs?: NodeAttrs;
  children: DraftNode[];
};

/** The `tag` shown for text nodes, which have no element of their own. */
export const TEXT_TAG = '#text';

// Removed with everything inside them: they hold code, metadata or nothing an agent reads.
export const DROPPED_TAGS = new Set([
  'head', 'script', 'style', 'noscript', 'iframe', 'object', 'embed', 'svg', 'template', 'hr', 'title',
]);

// Tags that map straight to a kind, with no attributes to read. Headings, links, images and
// form controls need attributes, so convert.ts handles them; every other tag is unwrapped.
export const KIND_BY_TAG: Record<string, NodeKind> = {
  p: 'paragraph', figcaption: 'paragraph',
  ul: 'list', ol: 'list', li: 'listItem',
  table: 'table', tr: 'row', td: 'cell', th: 'cell',
  form: 'form', button: 'button', blockquote: 'quote', pre: 'code',
  section: 'section', article: 'article', nav: 'nav', header: 'header',
  footer: 'footer', aside: 'aside', main: 'main', figure: 'figure',
};

// Form controls. Their content (options, typed text) is UI state, not page content, so it's ignored.
export const FIELD_TAGS = new Set(['input', 'select', 'textarea']);

// Kept even without text, because what they are is the content.
export const KINDS_KEPT_WHEN_EMPTY = new Set<NodeKind>(['image', 'field']);
