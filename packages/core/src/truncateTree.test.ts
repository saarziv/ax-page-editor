import { describe, expect, it } from 'vitest';
import type { PageNode } from './schemas.js';
import { truncateTree } from './truncateTree.js';

function paragraph(id: string, text: string): PageNode {
  return { id, kind: 'paragraph', tag: 'p', text };
}

function section(id: string, children: PageNode[]): PageNode {
  return { id, kind: 'section', tag: 'section', children };
}

const truncatedMarker: PageNode = { id: 'main:1>truncated', kind: 'paragraph', tag: 'p', text: '(truncated)' };

describe('truncateTree', () => {
  it('returns a tree under the limit unchanged', () => {
    const root = section('main:1', [paragraph('main:1>paragraph:1', 'Short terms.')]);
    expect(truncateTree(root, 100)).toBe(root);
  });

  it('returns a tree exactly at the limit unchanged', () => {
    const root = section('main:1', [paragraph('main:1>paragraph:1', '0123456789')]);
    expect(truncateTree(root, 10)).toBe(root);
  });

  it('keeps whole nodes while they fit, cuts the next at its last space before the limit, and ends with "(truncated)"', () => {
    const first = paragraph('main:1>paragraph:1', 'One two three.'); // 14 characters
    const root = section('main:1', [first, paragraph('main:1>paragraph:2', 'Four five six seven.'), paragraph('main:1>paragraph:3', 'Eight.')]);

    // 14 + 13 = 27: the limit falls right after "six", so "six" is kept whole.
    expect(truncateTree(root, 27)).toEqual(section('main:1', [first, paragraph('main:1>paragraph:2', 'Four five six'), truncatedMarker]));
  });

  it('drops containers left empty: a section whose text all came after the cut disappears', () => {
    const root = section('main:1', [
      section('main:1>section:1', [paragraph('main:1>section:1>paragraph:1', 'Kept words here and then some more.')]),
      section('main:1>section:2', [paragraph('main:1>section:2>paragraph:1', 'Never reached.')]),
    ]);

    expect(truncateTree(root, 20)).toEqual(
      section('main:1', [section('main:1>section:1', [paragraph('main:1>section:1>paragraph:1', 'Kept words here and')]), truncatedMarker]),
    );
  });

  it('drops the word the limit falls inside', () => {
    const root = section('main:1', [paragraph('main:1>paragraph:1', 'Four five six seven.')]);
    expect(truncateTree(root, 12)).toEqual(section('main:1', [paragraph('main:1>paragraph:1', 'Four five'), truncatedMarker]));
  });

  it('drops a paragraph whose only word runs past the limit', () => {
    const first = paragraph('main:1>paragraph:1', 'Fits.');
    const root = section('main:1', [first, paragraph('main:1>paragraph:2', 'Supercalifragilistic')]);

    expect(truncateTree(root, 10)).toEqual(section('main:1', [first, truncatedMarker]));
  });

  it('cuts inside a sentence made of text and links, keeping the earlier parts whole', () => {
    const text: PageNode = { id: 'main:1>paragraph:1>text:1', kind: 'text', tag: '#text', text: 'Read our ' };
    const link: PageNode = { id: 'main:1>paragraph:1>link:1', kind: 'link', tag: 'a', text: 'refund policy for details', attrs: { href: 'https://a.com/r' } };
    const root = section('main:1', [{ id: 'main:1>paragraph:1', kind: 'paragraph', tag: 'p', children: [text, link] }]);

    expect(truncateTree(root, 20)).toEqual(
      section('main:1', [{ id: 'main:1>paragraph:1', kind: 'paragraph', tag: 'p', children: [text, { ...link, text: 'refund' }] }, truncatedMarker]),
    );
  });

  it('turns a root that holds only text into children, so "(truncated)" can follow it', () => {
    const root: PageNode = { id: 'main:1', kind: 'main', tag: 'main', text: 'Alpha beta gamma delta' };

    expect(truncateTree(root, 12)).toEqual({
      id: 'main:1',
      kind: 'main',
      tag: 'main',
      children: [{ id: 'main:1>text:1', kind: 'text', tag: '#text', text: 'Alpha beta' }, truncatedMarker],
    });
  });

  it('never edits its input', () => {
    const root = section('main:1', [paragraph('main:1>paragraph:1', 'One two three four five six.')]);
    const before = structuredClone(root);
    truncateTree(root, 10);
    expect(root).toEqual(before);
  });
});
