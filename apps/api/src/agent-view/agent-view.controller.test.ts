import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Modification } from '@ax/core';
import { ConfigRepository, createConfigTable } from '../config/config.repository.js';
import { FetchError } from '../fetch/fetch-error.js';
import type { SafeFetchService } from '../fetch/safe-fetch.service.js';
import { PageTreeService } from '../page/page-tree.service.js';
import { AgentViewController, type HeaderSettableResponse } from './agent-view.controller.js';
import { AgentViewService } from './agent-view.service.js';

// Serves one small live page, and blocks every other address the way SafeFetchService blocks a private one.
const pricingPageHtml = '<main><h1>Pricing</h1><p>Plans start at $9.</p></main>';
const fakeSafeFetch = {
  fetchHtml: (url: string) =>
    url === 'https://acme.com/pricing'
      ? Promise.resolve({ finalUrl: url, html: pricingPageHtml })
      : Promise.reject(new FetchError('BLOCKED', `${url} points to a private address`)),
} as unknown as SafeFetchService;

// Targets as the editor saves them for the demo page (samples/demo.html after clean).
const hideCookieBanner: Modification = {
  id: 'm1',
  type: 'hide',
  target: { selector: 'aside:1', text: 'We use cookies to improve your experience. By continuing you' },
};
const chartNote: Modification = {
  id: 'm2',
  type: 'context',
  target: { selector: 'main:1>figure:1>image:1', text: 'Customer growth' },
  note: 'Customer growth from 1,200 to 8,500. # hi [x](y)',
};

let configRepository: ConfigRepository;
let controller: AgentViewController;

beforeEach(() => {
  const database = new Database(':memory:');
  createConfigTable(database);
  configRepository = new ConfigRepository(database);
  controller = new AgentViewController(new AgentViewService(new PageTreeService(fakeSafeFetch), configRepository));
});

function saveConfiguration(url: string, modifications: Modification[]): void {
  configRepository.save({ version: 1, url, updatedAt: '2026-10-12T12:00:00.000Z', modifications });
}

function recordingResponse(): HeaderSettableResponse & { headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  return { headers, setHeader: (name, value) => void (headers[name.toLowerCase()] = value) };
}

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the promise to reject');
}

describe('AgentViewController', () => {
  it('returns the clean demo page as Markdown when nothing is saved', async () => {
    const markdown = await controller.getAgentView('sample:demo', undefined, recordingResponse());

    expect(markdown).toContain('# Analytics that scale with you\n');
    expect(markdown).toContain('![Customer growth](https://dummyimage.com/');
    expect(markdown).toContain('| Plan | Price | Seats |\n| --- | --- | --- |\n| Starter | $9 / month | 3 |');
    expect(markdown).toContain('Field: Work email');
    expect(markdown).toContain('We use cookies');
  });

  it('answers text/markdown to an agent and text/plain to a browser tab', async () => {
    const agentResponse = recordingResponse();
    const browserResponse = recordingResponse();
    await controller.getAgentView('sample:demo', '*/*', agentResponse);
    await controller.getAgentView('sample:demo', 'text/html,application/xhtml+xml,*/*;q=0.8', browserResponse);

    expect(agentResponse.headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(browserResponse.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(agentResponse.headers.vary).toBe('Accept');
  });

  it('applies the saved configuration: the hidden banner is gone and the note sits right after the chart', async () => {
    saveConfiguration('sample:demo', [hideCookieBanner, chartNote]);

    const markdown = await controller.getAgentView('sample:demo', undefined, recordingResponse());

    expect(markdown).not.toMatch(/cookies|Accept all/);
    expect(markdown).toMatch(/!\[Customer growth\]\([^)]*\)\n\n> \*\*Context:\*\* Customer growth from 1,200 to 8,500\. \\# hi \\\[x\\\]\(y\)\n\nCustomers per month/);
  });

  it('skips a modification that no longer matches its element and still applies the others', async () => {
    const staleHide: Modification = { id: 'm3', type: 'hide', target: { selector: 'main:1>heading:1', text: 'A heading that changed' } };
    saveConfiguration('sample:demo', [staleHide, hideCookieBanner, chartNote]);

    const markdown = await controller.getAgentView('sample:demo', undefined, recordingResponse());

    expect(markdown).toContain('# Analytics that scale with you\n');
    expect(markdown).not.toContain('We use cookies');
    expect(markdown).toContain('> **Context:** Customer growth');
  });

  it('finds the configuration saved under the normalized URL for a utm_* address', async () => {
    const hidePricingHeading: Modification = { id: 'm1', type: 'hide', target: { selector: 'main:1>heading:1', text: 'Pricing' } };
    saveConfiguration('https://acme.com/pricing', [hidePricingHeading]);

    const markdown = await controller.getAgentView('https://acme.com/pricing/?utm_source=x', undefined, recordingResponse());

    expect(markdown).toBe('Plans start at $9.\n');
  });

  it('turns a missing url into a 400 INVALID_URL', async () => {
    for (const url of [undefined, '', ['a', 'b']]) {
      const thrown = await catchError(controller.getAgentView(url, undefined, recordingResponse()));
      expect((thrown as FetchError).getStatus()).toBe(400);
      expect((thrown as FetchError).code).toBe('INVALID_URL');
    }
  });

  it('passes a fetch failure through with its status and reason', async () => {
    const thrown = await catchError(controller.getAgentView('http://127.0.0.1', undefined, recordingResponse()));

    expect((thrown as FetchError).getStatus()).toBe(403);
    expect((thrown as FetchError).getResponse()).toEqual({ code: 'BLOCKED', message: expect.stringContaining('private address') });
  });
});
