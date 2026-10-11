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
  const alt = collapseWhitespace(DomUtils.getAttributeValue(image, 'alt') ?? '').trim();
  return [{ kind: 'image', tag: image.name, attrs: alt ? { src, alt } : { src }, children: [] }];
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
  return [{ kind: 'field', tag: control.name, ...(label ? { attrs: { label } } : {}), children: [] }];
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
