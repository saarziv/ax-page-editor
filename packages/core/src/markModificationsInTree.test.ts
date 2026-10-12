import { describe, expect, it } from 'vitest';
import { markModificationsInTree } from './markModificationsInTree.js';
import { targetFor } from './target.js';
import { findNodePath } from './tree.js';
import type { Modification, PageNode } from './schemas.js';

const bannerSnippet = 'We use cookies to improve your experience. By continuing you';

const banner: PageNode = {
  id: 'aside:1',
  kind: 'aside',
  tag: 'aside',
  children: [
    { id: 'aside:1>paragraph:1', kind: 'paragraph', tag: 'p', text: 'We use cookies to improve your experience. By continuing you agree to our cookie policy.' },
    { id: 'aside:1>button:1', kind: 'button', tag: 'button', text: 'Accept all' },
  ],
};

const section: PageNode = {
  id: 'main:1>section:1',
  kind: 'section',
  tag: 'section',
  children: [
    { id: 'main:1>section:1>heading:1', kind: 'heading', tag: 'h2', text: 'Pricing', attrs: { level: 2 } },
    {
      id: 'main:1>section:1>paragraph:1',
      kind: 'paragraph',
      tag: 'p',
      children: [
        { id: 'main:1>section:1>paragraph:1>text:1', kind: 'text', tag: '#text', text: 'See our ' },
        { id: 'main:1>section:1>paragraph:1>link:1', kind: 'link', tag: 'a', text: 'plans', attrs: { href: 'https://x.com/plans' } },
      ],
    },
    { id: 'main:1>section:1>image:1', kind: 'image', tag: 'img', attrs: { src: 'https://x.com/p.png', alt: 'Price table' } },
  ],
};

const main: PageNode = { id: 'main:1', kind: 'main', tag: 'main', children: [section] };

const root: PageNode = { id: '', kind: 'page', tag: 'body', children: [banner, main] };

function hideModification(id: string, selector: string, text: string): Modification {
  return { id, type: 'hide', target: { selector, text } };
}

function nodeAt(tree: PageNode, id: string): PageNode | undefined {
  return findNodePath(tree, id)?.at(-1);
}

describe('markModificationsInTree', () => {
  it('sets hidden on the hidden element and marks the hide active', () => {
    const marked = markModificationsInTree(root, [hideModification('h1', 'aside:1', bannerSnippet)]);

    expect(nodeAt(marked.tree, 'aside:1')?.hidden).toBe(true);
    expect(marked.status).toEqual({ h1: 'active' });
  });

  it('marks a hide unmatched and hides nothing when the element text changed', () => {
    const marked = markModificationsInTree(root, [hideModification('h1', 'aside:1', 'We use cookies to track you')]);

    expect(marked.status).toEqual({ h1: 'unmatched' });
    expect(marked.tree).toBe(root);
  });

  it('marks a hide unmatched when its selector is gone', () => {
    const marked = markModificationsInTree(root, [hideModification('h1', 'aside:2', bannerSnippet)]);

    expect(marked.status).toEqual({ h1: 'unmatched' });
    expect(marked.tree).toBe(root);
  });

  it('never changes the page it is given, and reuses the parts it did not hide', () => {
    const rootBefore = structuredClone(root);

    const marked = markModificationsInTree(root, [hideModification('h1', 'aside:1', bannerSnippet)]);

    expect(root).toEqual(rootBefore);
    expect(marked.tree).not.toBe(root);
    expect(nodeAt(marked.tree, 'aside:1')).not.toBe(banner);
    expect(nodeAt(marked.tree, 'main:1')).toBe(main);
    // The banner's own children are untouched, so they are shared too.
    expect(nodeAt(marked.tree, 'aside:1>paragraph:1')).toBe(banner.children?.[0]);
  });

  // K2: the flag sits on the section, so its text, links, images and nested elements are all inside the hidden part.
  it('hides a section with everything inside it', () => {
    const marked = markModificationsInTree(root, [hideModification('h1', 'main:1>section:1', targetFor(section).text)]);

    const hiddenSection = nodeAt(marked.tree, 'main:1>section:1');
    expect(hiddenSection?.hidden).toBe(true);
    expect(hiddenSection?.children).toBe(section.children);
    expect(findNodePath(marked.tree, 'main:1>section:1>paragraph:1>link:1')?.some((node) => node.hidden)).toBe(true);
    expect(findNodePath(marked.tree, 'main:1>section:1>image:1')?.some((node) => node.hidden)).toBe(true);
  });

  // K4: turning Hide off leaves nothing behind.
  it('returns a page equal to the original when there are no modifications', () => {
    const marked = markModificationsInTree(root, []);

    expect(marked.tree).toEqual(root);
    expect(marked.status).toEqual({});
  });

  it('marks a modification inside a hidden element inactive, and does not flag it', () => {
    const marked = markModificationsInTree(root, [
      hideModification('outer', 'main:1>section:1', targetFor(section).text),
      hideModification('inner', 'main:1>section:1>image:1', 'Price table'),
    ]);

    expect(marked.status).toEqual({ outer: 'active', inner: 'inactive' });
    expect(nodeAt(marked.tree, 'main:1>section:1>image:1')?.hidden).toBeUndefined();
  });
});
