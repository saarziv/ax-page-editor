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

// Step 3: where each note lands. A small page with every placement case:
// page > main:1 > [ figure:1 > [image, caption], section:1 > [heading, table, paragraph with a link] ]
const chart: PageNode = { id: 'main:1>figure:1>image:1', kind: 'image', tag: 'img', attrs: { src: 'https://x.com/g.png', alt: 'Customer growth' } };
const caption: PageNode = { id: 'main:1>figure:1>paragraph:1', kind: 'paragraph', tag: 'figcaption', text: 'Customers per month' };
const figure: PageNode = { id: 'main:1>figure:1', kind: 'figure', tag: 'figure', children: [chart, caption] };

const priceCell: PageNode = { id: 'main:1>section:1>table:1>row:1>cell:2', kind: 'cell', tag: 'td', text: '$9 / month' };
const priceTable: PageNode = {
  id: 'main:1>section:1>table:1',
  kind: 'table',
  tag: 'table',
  children: [
    {
      id: 'main:1>section:1>table:1>row:1',
      kind: 'row',
      tag: 'tr',
      children: [{ id: 'main:1>section:1>table:1>row:1>cell:1', kind: 'cell', tag: 'td', text: 'Starter' }, priceCell],
    },
  ],
};
const termsLink: PageNode = { id: 'main:1>section:1>paragraph:1>link:1', kind: 'link', tag: 'a', text: 'terms', attrs: { href: 'https://x.com/terms' } };
const termsParagraph: PageNode = {
  id: 'main:1>section:1>paragraph:1',
  kind: 'paragraph',
  tag: 'p',
  children: [
    { id: 'main:1>section:1>paragraph:1>text:1', kind: 'text', tag: '#text', text: 'Read our ' },
    termsLink,
    { id: 'main:1>section:1>paragraph:1>text:2', kind: 'text', tag: '#text', text: ' before signing up.' },
  ],
};
const plansHeading: PageNode = { id: 'main:1>section:1>heading:1', kind: 'heading', tag: 'h2', text: 'Plans', attrs: { level: 2 } };
const plansSection: PageNode = { id: 'main:1>section:1', kind: 'section', tag: 'section', children: [plansHeading, priceTable, termsParagraph] };
const contextPage: PageNode = {
  id: '',
  kind: 'page',
  tag: 'body',
  children: [{ id: 'main:1', kind: 'main', tag: 'main', children: [figure, plansSection] }],
};

function contextModification(id: string, node: PageNode, note: string): Modification {
  return { id, type: 'context', target: targetFor(node), note };
}

function childIds(tree: PageNode, id: string): string[] | undefined {
  return nodeAt(tree, id)?.children?.map((child) => child.id);
}

describe('markModificationsInTree, step 3: context notes', () => {
  // K6: a non-container gets its note right after it.
  it('puts a note on an image right after the image', () => {
    const marked = markModificationsInTree(contextPage, [contextModification('c1', chart, 'Customer growth from 1,200 to 8,500.')]);

    expect(marked.status).toEqual({ c1: 'active' });
    expect(nodeAt(marked.tree, 'main:1>figure:1')?.children).toEqual([
      chart,
      { id: 'context:c1', kind: 'annotation', tag: 'aside', text: 'Customer growth from 1,200 to 8,500.', attrs: { forId: chart.id } },
      caption,
    ]);
  });

  // K7: a container gets its note first, so it frames what follows.
  it('puts a note on a section first inside the section', () => {
    const marked = markModificationsInTree(contextPage, [contextModification('c1', plansSection, 'Our three plans.')]);

    expect(childIds(marked.tree, plansSection.id)).toEqual(['context:c1', plansHeading.id, priceTable.id, termsParagraph.id]);
  });

  it('puts a note on a container that holds only text before that text', () => {
    const textOnlyAside: PageNode = { id: 'aside:1', kind: 'aside', tag: 'aside', text: 'Limited offer' };
    const page: PageNode = { id: '', kind: 'page', tag: 'body', children: [textOnlyAside] };

    const marked = markModificationsInTree(page, [contextModification('c1', textOnlyAside, 'A promo.')]);

    const markedAside = nodeAt(marked.tree, 'aside:1');
    expect(markedAside?.text).toBeUndefined();
    expect(markedAside?.children?.map((child) => [child.kind, child.text])).toEqual([
      ['annotation', 'A promo.'],
      ['text', 'Limited offer'],
    ]);
  });

  // K8: the sentence stays whole, and the note names the link.
  it('puts a note on a link inside a paragraph right after the paragraph, with about', () => {
    const marked = markModificationsInTree(contextPage, [contextModification('c1', termsLink, 'Monthly plans, cancel anytime.')]);

    expect(nodeAt(marked.tree, termsParagraph.id)).toBe(termsParagraph);
    expect(childIds(marked.tree, plansSection.id)).toEqual([plansHeading.id, priceTable.id, termsParagraph.id, 'context:c1']);
    expect(nodeAt(marked.tree, 'context:c1')?.attrs).toEqual({ forId: termsLink.id, about: 'terms' });
  });

  it('puts a note on a table cell right after the whole table, with about', () => {
    const marked = markModificationsInTree(contextPage, [contextModification('c1', priceCell, 'Billed yearly.')]);

    expect(nodeAt(marked.tree, priceTable.id)).toBe(priceTable);
    expect(childIds(marked.tree, plansSection.id)).toEqual([plansHeading.id, priceTable.id, 'context:c1', termsParagraph.id]);
    expect(nodeAt(marked.tree, 'context:c1')?.attrs).toEqual({ forId: priceCell.id, about: '$9 / month' });
  });

  it('keeps reading order when a paragraph and its link both have notes', () => {
    // Listed link first, to show the order comes from the page, not from the list.
    const marked = markModificationsInTree(contextPage, [
      contextModification('onLink', termsLink, 'About the link.'),
      contextModification('onParagraph', termsParagraph, 'About the paragraph.'),
    ]);

    expect(childIds(marked.tree, plansSection.id)).toEqual([plansHeading.id, priceTable.id, termsParagraph.id, 'context:onParagraph', 'context:onLink']);
  });

  it('makes a note on a hidden element, or inside one, inactive and does not insert it', () => {
    const marked = markModificationsInTree(contextPage, [
      hideModification('hideFigure', figure.id, targetFor(figure).text),
      contextModification('onFigure', figure, 'On the hidden figure.'),
      contextModification('onChart', chart, 'Inside the hidden figure.'),
    ]);

    expect(marked.status).toEqual({ hideFigure: 'active', onFigure: 'inactive', onChart: 'inactive' });
    expect(childIds(marked.tree, 'main:1')).toEqual([figure.id, plansSection.id]);
    expect(nodeAt(marked.tree, figure.id)?.children).toBe(figure.children);
  });

  it('does not insert a note whose element text changed', () => {
    const marked = markModificationsInTree(contextPage, [{ id: 'c1', type: 'context', target: { selector: chart.id, text: 'Old chart' }, note: 'x' }]);

    expect(marked.status).toEqual({ c1: 'unmatched' });
    expect(marked.tree).toBe(contextPage);
  });

  // K9: the note is never parsed.
  it('keeps the note exactly as typed, and never changes the page it is given', () => {
    const note = '<script>alert(1)</script> # heading [x](y)';
    const pageBefore = structuredClone(contextPage);

    const marked = markModificationsInTree(contextPage, [contextModification('c1', chart, note)]);

    expect(nodeAt(marked.tree, 'context:c1')?.text).toBe(note);
    expect(contextPage).toEqual(pageBefore);
    // Only the figure and its ancestors are copied; the section is shared.
    expect(nodeAt(marked.tree, plansSection.id)).toBe(plansSection);
  });
});
