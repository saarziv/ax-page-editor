import { describe, expect, it } from 'vitest';
import { FetchError } from '../fetch/fetch-error.js';
import type { SafeFetchService } from '../fetch/safe-fetch.service.js';
import { PageTreeService } from '../page/page-tree.service.js';
import { AgentViewController, type HeaderSettableResponse } from './agent-view.controller.js';
import { AgentViewService } from './agent-view.service.js';

const blockingSafeFetch = {
  fetchHtml: (url: string) => Promise.reject(new FetchError('BLOCKED', `${url} points to a private address`)),
} as unknown as SafeFetchService;
const controller = new AgentViewController(new AgentViewService(new PageTreeService(blockingSafeFetch)));

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
  it('returns the demo page as Markdown', async () => {
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
