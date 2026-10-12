import { describe, expect, it } from 'vitest';
import { findNodePath, nodeText } from './tree.js';
import type { PageNode } from './schemas.js';

const termsLink: PageNode = { id: 'link:1', kind: 'link', tag: 'a', text: 'terms of service', attrs: { href: 'https://x.com/terms' } };

const termsParagraph: PageNode = {
  id: 'paragraph:1',
  kind: 'paragraph',
  tag: 'p',
  children: [
    { id: 'text:1', kind: 'text', tag: '#text', text: 'Read our ' },
    termsLink,
    { id: 'text:2', kind: 'text', tag: '#text', text: ' and   the\n privacy policy.' },
  ],
};

const root: PageNode = {
  id: 'page:1',
  kind: 'page',
  tag: 'body',
  children: [
    { id: 'heading:1', kind: 'heading', tag: 'h1', text: 'Welcome' },
    { id: 'main:1', kind: 'main', tag: 'main', children: [{ id: 'section:1', kind: 'section', tag: 'section', children: [termsParagraph] }] },
  ],
};

describe('findNodePath', () => {
  it('returns the chain from the root down to a nested node', () => {
    expect(findNodePath(root, 'link:1')?.map((node) => node.kind)).toEqual(['page', 'main', 'section', 'paragraph', 'link']);
  });

  it('returns just the root for the root id', () => {
    expect(findNodePath(root, 'page:1')).toEqual([root]);
  });

  it('ends with the node itself', () => {
    expect(findNodePath(root, 'link:1')?.at(-1)).toBe(termsLink);
  });

  it('returns null for an id that is not in the tree', () => {
    expect(findNodePath(root, 'link:99')).toBeNull();
  });
});

describe('nodeText', () => {
  it("joins a node's text with its children's, in order, with spaces tidied", () => {
    expect(nodeText(termsParagraph)).toBe('Read our terms of service and the privacy policy.');
  });

  it("returns a leaf's own text", () => {
    expect(nodeText(termsLink)).toBe('terms of service');
  });

  it('returns an empty string for a node with no text anywhere', () => {
    expect(nodeText({ id: 'image:1', kind: 'image', tag: 'img', attrs: { alt: 'Chart' } })).toBe('');
  });
});
