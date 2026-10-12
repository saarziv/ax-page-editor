import { describe, expect, it } from 'vitest';
import { matchesTarget, resolve, targetSnippet } from './target.js';
import type { PageNode } from './schemas.js';

const bannerText = 'We use cookies to improve your experience. By continuing you agree to our cookie policy.';
const bannerSnippet = 'We use cookies to improve your experience. By continuing you';

const banner: PageNode = {
  id: 'aside:1',
  kind: 'aside',
  tag: 'aside',
  children: [
    { id: 'aside:1>paragraph:1', kind: 'paragraph', tag: 'p', text: bannerText },
    { id: 'aside:1>button:1', kind: 'button', tag: 'button', text: 'Accept all' },
  ],
};

const chart: PageNode = { id: 'main:1>figure:1>image:1', kind: 'image', tag: 'img', attrs: { src: 'https://x.com/c.png', alt: 'Customer growth' } };

const root: PageNode = {
  id: 'page:1',
  kind: 'page',
  tag: 'body',
  children: [banner, { id: 'main:1', kind: 'main', tag: 'main', children: [{ id: 'main:1>figure:1', kind: 'figure', tag: 'figure', children: [chart] }] }],
};

describe('targetSnippet', () => {
  it("is the first 60 characters of the node's normalized text", () => {
    expect(targetSnippet(banner)).toBe(bannerSnippet);
  });

  it('is the whole text when it is shorter than 60 characters', () => {
    expect(targetSnippet({ id: 'link:1', kind: 'link', tag: 'a', text: '  terms   of service ' })).toBe('terms of service');
  });

  it('is the alt for an image', () => {
    expect(targetSnippet(chart)).toBe('Customer growth');
  });

  it('is empty for an image with no alt', () => {
    expect(targetSnippet({ id: 'image:1', kind: 'image', tag: 'img' })).toBe('');
  });
});

describe('matchesTarget', () => {
  it('matches when both the selector and the snippet are the same', () => {
    expect(matchesTarget(banner, { selector: 'aside:1', text: bannerSnippet })).toBe(true);
  });

  it('does not match another node with the same text', () => {
    expect(matchesTarget(banner, { selector: 'aside:2', text: bannerSnippet })).toBe(false);
  });

  it('does not match when the text changed', () => {
    expect(matchesTarget(banner, { selector: 'aside:1', text: 'We use cookies.' })).toBe(false);
  });
});

describe('resolve', () => {
  it('returns the node when the selector and snippet match', () => {
    expect(resolve(root, { selector: 'aside:1', text: bannerSnippet })).toBe(banner);
  });

  it('resolves a nested image by its alt', () => {
    expect(resolve(root, { selector: 'main:1>figure:1>image:1', text: 'Customer growth' })).toBe(chart);
  });

  it('returns null when the selector exists but the text changed', () => {
    expect(resolve(root, { selector: 'aside:1', text: 'We use cookies to track you.' })).toBeNull();
  });

  it("returns null when the selector isn't in the tree", () => {
    expect(resolve(root, { selector: 'aside:2', text: bannerSnippet })).toBeNull();
  });
});
