import type { PageNode, Target } from './schemas.js';
import { findNodePath, nodeText } from './tree.js';

const SNIPPET_LENGTH = 60;

/** The text a target stores to prove it still points at the same element: the first 60 characters, or the alt for an image. */
export function targetSnippet(node: PageNode): string {
  const text = node.kind === 'image' ? (node.attrs?.alt ?? '') : nodeText(node);
  return text.slice(0, SNIPPET_LENGTH);
}

export function matchesTarget(node: PageNode, target: Target): boolean {
  return node.id === target.selector && targetSnippet(node) === target.text;
}

/** The node a target points at, or null when the selector is gone or its text changed. Never guesses a nearby node. */
export function resolve(root: PageNode, target: Target): PageNode | null {
  const node = findNodePath(root, target.selector)?.at(-1);
  return node && matchesTarget(node, target) ? node : null;
}
