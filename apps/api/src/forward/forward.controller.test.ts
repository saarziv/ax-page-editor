import { describe, expect, it } from 'vitest';
import type { PageNode } from '@ax/core';
import { FetchError } from '../fetch/fetch-error.js';
import type { SafeFetchService } from '../fetch/safe-fetch.service.js';
import { PageTreeService } from '../page/page-tree.service.js';
import { ForwardController } from './forward.controller.js';
import { ForwardService } from './forward.service.js';

// Serves one page with chrome around its content, and blocks every other address the way SafeFetchService blocks a private one.
const termsPageHtml = `
  <header><a href="/">Acme</a></header>
  <nav><a href="/docs">Docs</a></nav>
  <main><h1>Terms</h1><p>You agree to these terms.</p><aside><p>Related posts</p></aside></main>
  <footer><p>© Acme</p></footer>`;
const fakeSafeFetch = {
  fetchHtml: (url: string) =>
    url === 'https://acme.com/terms'
      ? Promise.resolve({ finalUrl: url, html: termsPageHtml })
      : Promise.reject(new FetchError('BLOCKED', `${url} points to a private address`)),
} as unknown as SafeFetchService;
const controller = new ForwardController(new ForwardService(new PageTreeService(fakeSafeFetch)));

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

describe('ForwardController', () => {
  it('returns only the main content of the linked page', async () => {
    const forwardedPage = await controller.getForwardedPage({ url: 'https://acme.com/terms' });
    const kinds = flatten(forwardedPage.root).map((node) => node.kind);

    expect(forwardedPage.url).toBe('https://acme.com/terms');
    expect(forwardedPage.root.kind).toBe('main');
    expect(kinds).toEqual(expect.arrayContaining(['heading', 'paragraph']));
    for (const chromeKind of ['nav', 'header', 'footer', 'aside']) expect(kinds).not.toContain(chromeKind);
    expect(JSON.stringify(forwardedPage)).not.toMatch(/Related posts|© Acme|Docs/);
  });

  it('passes a fetch failure through with its code', async () => {
    const thrown = await catchError(controller.getForwardedPage({ url: 'http://127.0.0.1' }));

    expect((thrown as FetchError).getStatus()).toBe(403);
    expect((thrown as FetchError).getResponse()).toEqual({ code: 'BLOCKED', message: expect.stringContaining('private address') });
  });
});
