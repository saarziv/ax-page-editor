import { describe, expect, it } from 'vitest';
import type { PageNode } from '@ax/core';
import type { FetchedHtml, SafeFetchService } from '../fetch/safe-fetch.service.js';
import { PageTreeService } from './page-tree.service.js';

function serviceAnswering(fetched: FetchedHtml): PageTreeService {
  const fakeSafeFetch = { fetchHtml: () => Promise.resolve(fetched) } as unknown as SafeFetchService;
  return new PageTreeService(fakeSafeFetch);
}

function flatten(node: PageNode): PageNode[] {
  return [node, ...(node.children ?? []).flatMap(flatten)];
}

describe('PageTreeService with a real page', () => {
  it('keys the tree by the final address after a redirect, normalized', async () => {
    const service = serviceAnswering({ finalUrl: 'https://Site.com/new/?utm_source=x', html: '<h1>New</h1>' });
    const pageTree = await service.getPageTree('https://site.com/old');
    expect(pageTree.url).toBe('https://site.com/new');
  });

  it('resolves relative links against the real final address, not the normalized one', async () => {
    const service = serviceAnswering({ finalUrl: 'https://site.com/docs/', html: '<p><a href="intro">Intro</a></p>' });
    const pageTree = await service.getPageTree('https://site.com/docs/');
    const link = flatten(pageTree.root).find((node) => node.kind === 'link');
    expect(link?.attrs?.href).toBe('https://site.com/docs/intro');
  });
});
