/**
 * Reads text straight from the raw DOM, for things the draft tree can't answer: a field's label
 * (which may sit anywhere on the page) and the `<title>` (dropped with `head`).
 */
import { isTag, isText, type ChildNode, type Document, type Element } from 'domhandler';
import { DomUtils } from 'htmlparser2';
import { DROPPED_TAGS, FIELD_TAGS } from './rules.js';

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ');
}

/** The text a reader sees: no dropped elements, no option lists or typed field values. */
export function readableText(element: Element): string {
  const parts: string[] = [];
  const visit = (domNode: ChildNode): void => {
    if (isText(domNode)) {
      parts.push(domNode.data);
    } else if (isTag(domNode) && !DROPPED_TAGS.has(domNode.name) && !FIELD_TAGS.has(domNode.name)) {
      domNode.children.forEach(visit);
    }
  };
  element.children.forEach(visit);
  return collapseWhitespace(parts.join('')).trim();
}

export function findAncestor(element: Element, tag: string): Element | undefined {
  for (let ancestor = element.parent; ancestor; ancestor = ancestor.parent) {
    if (isTag(ancestor) && ancestor.name === tag) return ancestor;
  }
  return undefined;
}

// ---------- field labels ----------

/** Collected once up front, because a `label[for]` can appear anywhere, even after its field. */
export function collectLabelsByFieldId(document: Document): Map<string, string> {
  const labelTextById = new Map<string, string>();
  const labels = DomUtils.findAll((element) => element.name === 'label', document.children);
  for (const label of labels) {
    const fieldId = DomUtils.getAttributeValue(label, 'for');
    const labelText = readableText(label);
    // The first label for an id wins, like in the browser.
    if (fieldId && labelText && !labelTextById.has(fieldId)) labelTextById.set(fieldId, labelText);
  }
  return labelTextById;
}

/** The first non-blank of: aria-label, `label[for]`, wrapping label, placeholder, name. */
export function findFieldLabel(field: Element, labelTextById: Map<string, string>): string | undefined {
  const fieldId = DomUtils.getAttributeValue(field, 'id');
  const wrappingLabel = findAncestor(field, 'label');
  const labelCandidates = [
    DomUtils.getAttributeValue(field, 'aria-label'),
    fieldId ? labelTextById.get(fieldId) : undefined,
    wrappingLabel ? readableText(wrappingLabel) : undefined,
    DomUtils.getAttributeValue(field, 'placeholder'),
    DomUtils.getAttributeValue(field, 'name'),
  ];
  return labelCandidates.map((candidate) => collapseWhitespace(candidate ?? '').trim()).find(Boolean);
}

// ---------- title ----------

/** The page's `<title>` text, or `undefined`. An SVG's own `<title>` is a tooltip, not the page's. */
export function findDocumentTitle(document: Document): string | undefined {
  const titleElement = DomUtils.findOne(
    (element) => element.name === 'title' && !findAncestor(element, 'svg'),
    document.children,
  );
  return (titleElement && readableText(titleElement)) || undefined;
}
