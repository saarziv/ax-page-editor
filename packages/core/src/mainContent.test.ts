import { describe, expect, it } from 'vitest';
import { mainContent } from './mainContent.js';
import type { PageNode } from './schemas.js';

function node(id: string, kind: PageNode['kind'], children?: PageNode[], text?: string): PageNode {
  return { id, kind, tag: kind, ...(text === undefined ? {} : { text }), ...(children ? { children } : {}) };
}

function page(children: PageNode[]): PageNode {
  return node('page', 'page', children);
}

describe('mainContent', () => {
  it('keeps main and drops the chrome around and inside it', () => {
    const root = page([
      node('header:1', 'header', [node('header:1>link:1', 'link', undefined, 'Home')]),
      node('nav:1', 'nav', [node('nav:1>link:1', 'link', undefined, 'Docs')]),
      node('main:1', 'main', [
        node('main:1>heading:1', 'heading', undefined, 'Terms'),
        node('main:1>paragraph:1', 'paragraph', undefined, 'You agree to these terms.'),
        node('main:1>aside:1', 'aside', [node('main:1>aside:1>paragraph:1', 'paragraph', undefined, 'Related posts')]),
      ]),
      node('footer:1', 'footer', [node('footer:1>paragraph:1', 'paragraph', undefined, '© Acme')]),
    ]);

    expect(mainContent(root)).toEqual(
      node('main:1', 'main', [
        node('main:1>heading:1', 'heading', undefined, 'Terms'),
        node('main:1>paragraph:1', 'paragraph', undefined, 'You agree to these terms.'),
      ]),
    );
  });

  it('finds main at any depth', () => {
    const root = page([node('section:1', 'section', [node('section:1>main:1', 'main', [node('section:1>main:1>paragraph:1', 'paragraph', undefined, 'Body')])])]);
    expect(mainContent(root).id).toBe('section:1>main:1');
  });

  it('without main, takes the article with the most text', () => {
    const root = page([
      node('article:1', 'article', [node('article:1>paragraph:1', 'paragraph', undefined, 'Short teaser')]),
      node('article:2', 'article', [node('article:2>paragraph:1', 'paragraph', undefined, 'The full story, with a lot more words in it.')]),
    ]);
    expect(mainContent(root).id).toBe('article:2');
  });

  it('without main or article, keeps the root and removes chrome at any depth', () => {
    const root = page([
      node('section:1', 'section', [
        node('section:1>paragraph:1', 'paragraph', undefined, 'Body'),
        node('section:1>div:1', 'section', [node('section:1>div:1>nav:1', 'nav', [node('section:1>div:1>nav:1>link:1', 'link', undefined, 'Next')])]),
      ]),
      node('footer:1', 'footer'),
    ]);

    expect(mainContent(root)).toEqual(
      page([node('section:1', 'section', [node('section:1>paragraph:1', 'paragraph', undefined, 'Body'), node('section:1>div:1', 'section', [])])]),
    );
  });

  it('never edits its input', () => {
    const root = page([node('main:1', 'main', [node('main:1>nav:1', 'nav')])]);
    const before = structuredClone(root);
    mainContent(root);
    expect(root).toEqual(before);
  });
});
