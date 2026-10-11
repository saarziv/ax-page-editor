import { describe, expect, it } from 'vitest';
import type { PageNode } from '@ax/core';
import { FetchError } from '../fetch/fetch-error.js';
import { PageTreeController } from './page-tree.controller.js';
import { PageTreeService } from './page-tree.service.js';

const controller = new PageTreeController(new PageTreeService());

function flatten(node: PageNode): PageNode[] {
  return [node, ...(node.children ?? []).flatMap(flatten)];
}

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the promise to reject');
}

describe('PageTreeController', () => {
  it('returns the tree under the normalized url', async () => {
    const pageTree = await controller.getPageTree({ url: 'HTTPS://Example.com/page/?utm_source=x#top' });
    expect(pageTree.url).toBe('https://example.com/page');
  });

  it('turns an invalid url into a 400 INVALID_URL FetchError', async () => {
    const thrown = await catchError(controller.getPageTree({ url: 'ftp://x' }));

    expect(thrown).toBeInstanceOf(FetchError);
    expect((thrown as FetchError).getStatus()).toBe(400);
    expect((thrown as FetchError).getResponse()).toEqual({
      code: 'INVALID_URL',
      message: expect.stringContaining('ftp://x'),
    });
  });

  it('loads sample:demo from disk as a clean tree', async () => {
    const pageTree = await controller.getPageTree({ url: 'sample:demo' });
    const nodes = flatten(pageTree.root);
    const kinds = new Set(nodes.map((node) => node.kind));

    expect(pageTree.url).toBe('sample:demo');
    expect(pageTree.title).toBe('Acme Analytics – Pricing');
    expect([...kinds]).toEqual(expect.arrayContaining(['heading', 'image', 'form', 'field', 'link']));
    expect(nodes.find((node) => node.id === 'aside:1')).toBeDefined();
    expect(nodes.find((node) => node.id === 'main:1>figure:1>image:1')?.attrs?.alt).toBe('Customer growth');
    // No page code or hidden values make it into the tree.
    const serialized = JSON.stringify(pageTree);
    expect(serialized).not.toContain('acceptCookies');
    expect(serialized).not.toContain('dataLayer');
    expect(serialized).not.toContain('do-not-show');
  });

  it('refuses unknown samples, so a sample name can never reach other files', async () => {
    for (const url of ['sample:nope', 'sample:../package.json']) {
      const thrown = await catchError(controller.getPageTree({ url }));
      expect((thrown as FetchError).code).toBe('INVALID_URL');
    }
  });
});
