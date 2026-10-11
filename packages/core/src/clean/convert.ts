/**
 * Step 1 of `clean`: walk the parsed DOM and turn it into draft nodes, following the tag rules.
 * Each DOM node becomes zero nodes (dropped), one node (mapped), or its children (unwrapped),
 * which is why every converter returns an array.
 */
import { isTag, isText, type ChildNode, type Element } from 'domhandler';
import { DomUtils } from 'htmlparser2';
import { collapseWhitespace, findFieldLabel } from './dom-text.js';
import { DROPPED_TAGS, FIELD_TAGS, KIND_BY_TAG, TEXT_TAG, type DraftNode, type NodeAttrs, type NodeKind } from './rules.js';
import { resolveHref, resolveUrl } from './urls.js';

export type ConvertContext = { baseUrl: string; labelTextById: Map<string, string> };

const HEADING_TAG = /^h[1-6]$/;

export function convertChildren(domNodes: ChildNode[], context: ConvertContext): DraftNode[] {
  return domNodes.flatMap((domNode) => convertNode(domNode, context));
}

function convertNode(domNode: ChildNode, context: ConvertContext): DraftNode[] {
  if (isText(domNode)) return [textDraft(domNode.data)];
  // Comments, doctypes and CDATA carry nothing to read.
  if (!isTag(domNode)) return [];

  const tag = domNode.name;
  if (DROPPED_TAGS.has(tag)) return [];
  // A line break only separates words, so a space keeps them apart.
  if (tag === 'br') return [textDraft(' ')];
  if (FIELD_TAGS.has(tag)) return convertFormControl(domNode, context);
  if (HEADING_TAG.test(tag)) return convertHeading(domNode, context);
  if (tag === 'a') return convertLink(domNode, context);
  if (tag === 'img') return convertImage(domNode, context);

  const kind = KIND_BY_TAG[tag];
  if (kind) return [elementDraft(kind, domNode, undefined, context)];
  // div, span, strong, label, thead…: the wrapper goes, its content stays.
  return convertChildren(domNode.children, context);
}

function convertHeading(heading: Element, context: ConvertContext): DraftNode[] {
  const level = Number(heading.name[1]);
  return [elementDraft('heading', heading, { level }, context)];
}

function convertLink(link: Element, context: ConvertContext): DraftNode[] {
  const href = resolveHref(DomUtils.getAttributeValue(link, 'href'), context.baseUrl);
  // A link an agent can't follow is just its text.
  if (href === undefined) return convertChildren(link.children, context);
  return [elementDraft('link', link, { href }, context)];
}

function convertImage(image: Element, context: ConvertContext): DraftNode[] {
  const src = resolveUrl(DomUtils.getAttributeValue(image, 'src'), context.baseUrl);
  // An image with no source shows nothing.
  if (src === undefined) return [];
  if (isDecorative(image)) return [];
  const alt = collapseWhitespace(DomUtils.getAttributeValue(image, 'alt') ?? '').trim();
  return [{ kind: 'image', tag: image.name, attrs: { src, ...(alt ? { alt } : {}), ...readImageSize(image) }, children: [] }];
}

// These are HTML's own "skip this" signals: screen readers and agents that read the accessibility
// tree never see such an image, so an agent gets nothing from it. A *missing* alt is different:
// the author said nothing, so the image may matter and is kept.
function isDecorative(image: Element): boolean {
  const alt = DomUtils.getAttributeValue(image, 'alt');
  const role = DomUtils.getAttributeValue(image, 'role')?.trim().toLowerCase();
  return (
    (alt !== undefined && alt.trim() === '') ||
    DomUtils.getAttributeValue(image, 'aria-hidden')?.trim().toLowerCase() === 'true' ||
    role === 'presentation' ||
    role === 'none'
  );
}

// Our only way to know a logo is small: stylesheets never reach us, so without this the preview
// draws an SVG at its natural size. Agents ignore it.
function readImageSize(image: Element): { width?: number; height?: number } {
  const declaredStyle = parseInlineStyle(DomUtils.getAttributeValue(image, 'style'));
  const size: { width?: number; height?: number } = {};
  for (const dimension of ['width', 'height'] as const) {
    // As in the browser, the inline style wins over the attribute.
    const pixels =
      toPixels(declaredStyle.get(dimension)) ?? toPixels(DomUtils.getAttributeValue(image, dimension));
    if (pixels !== undefined) size[dimension] = pixels;
  }
  return size;
}

function parseInlineStyle(style: string | undefined): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const declaration of (style ?? '').split(';')) {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex === -1) continue;
    declarations.set(declaration.slice(0, colonIndex).trim().toLowerCase(), declaration.slice(colonIndex + 1).trim());
  }
  return declarations;
}

// em/rem depend on the page's font size, which we don't have; 16px is the browser default.
const PIXELS_PER_UNIT: Record<string, number> = { '': 1, px: 1, em: 16, rem: 16 };
const LENGTH = /^(\d+(?:\.\d+)?)\s*(px|em|rem)?$/i;

/** `50`, `50px`, `8.75em` → pixels. `100%`, `auto` and anything else → undefined. */
function toPixels(length: string | undefined): number | undefined {
  const match = LENGTH.exec(length?.trim() ?? '');
  if (!match?.[1]) return undefined;
  const pixels = Math.round(Number(match[1]) * (PIXELS_PER_UNIT[(match[2] ?? '').toLowerCase()] ?? 1));
  return pixels > 0 ? pixels : undefined;
}

/** Fields are leaves: an agent needs to know a field exists and what it's for, not its options. */
function convertFormControl(control: Element, context: ConvertContext): DraftNode[] {
  const inputType = (DomUtils.getAttributeValue(control, 'type') ?? '').toLowerCase();
  if (control.name === 'input') {
    if (inputType === 'hidden') return [];
    // These look and act like buttons, so they're shown as one, labelled by their value.
    if (inputType === 'submit' || inputType === 'button') {
      const buttonText = DomUtils.getAttributeValue(control, 'value') ?? '';
      return [{ kind: 'button', tag: 'input', children: [textDraft(buttonText)] }];
    }
  }
  const label = findFieldLabel(control, context.labelTextById);
  const attrs: NodeAttrs = {
    ...(label ? { label } : {}),
    // A checkbox and a text box are both `field`s; without the type the preview can't tell them apart.
    // A missing type means text, as in the browser.
    ...(control.name === 'input' ? { inputType: inputType || 'text' } : {}),
  };
  return [{ kind: 'field', tag: control.name, ...(Object.keys(attrs).length > 0 ? { attrs } : {}), children: [] }];
}

function elementDraft(
  kind: NodeKind,
  element: Element,
  attrs: NodeAttrs | undefined,
  context: ConvertContext,
): DraftNode {
  const children = convertChildren(element.children, context);
  return { kind, tag: element.name, ...(attrs ? { attrs } : {}), children };
}

export function textDraft(text: string): DraftNode {
  return { kind: 'text', tag: TEXT_TAG, text, children: [] };
}
