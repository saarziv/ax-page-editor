import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchConfig, fetchForwardedPage, ForwardFetchError, REQUEST_TIMEOUT_MS, saveConfig } from './queries';

const saveRequest = { url: 'sample:demo', modifications: [] };

describe('saveConfig', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fails when the server answers with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));

    await expect(saveConfig(saveRequest)).rejects.toThrow('failed with 500');
  });

  it('fails after the timeout when the server never answers', async () => {
    // A hanging server: the request only ends when its signal aborts it.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
          }),
      ),
    );

    const pendingSave = saveConfig(saveRequest);
    const saveFailure = expect(pendingSave).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

    await saveFailure;
  });

  it('does not fail before the timeout', async () => {
    let aborted = false;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        init.signal?.addEventListener('abort', () => (aborted = true));
        return new Promise<Response>(() => {});
      }),
    );

    void saveConfig(saveRequest);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);

    expect(aborted).toBe(false);
  });
});

describe('fetchConfig', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads a 404 as nothing saved', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"code":"NOT_FOUND"}', { status: 404 })));

    await expect(fetchConfig('sample:demo')).resolves.toBeNull();
  });

  it('fails when the server answers with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));

    await expect(fetchConfig('sample:demo')).rejects.toThrow('failed with 500');
  });

  it('asks for the url encoded as one path segment, and returns the saved configuration', async () => {
    const savedConfig = { version: 1, url: 'https://acme.com/pricing', updatedAt: '2026-10-12T09:00:00.000Z', modifications: [] };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(savedConfig), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchConfig('https://acme.com/pricing')).resolves.toEqual(savedConfig);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/configs/https%3A%2F%2Facme.com%2Fpricing', expect.anything());
  });
});

describe('fetchForwardedPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  async function forwardFailureCode(): Promise<unknown> {
    try {
      await fetchForwardedPage('https://acme.com/terms');
    } catch (error) {
      return error instanceof ForwardFetchError ? error.code : error;
    }
    throw new Error('Expected fetchForwardedPage to fail');
  }

  it("keeps the api's code when the forward fails", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"code":"BLOCKED","message":"private address"}', { status: 403 })));

    await expect(forwardFailureCode()).resolves.toBe('BLOCKED');
  });

  it('reads a failure without a code as UNREACHABLE', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<h1>Bad gateway</h1>', { status: 502 })));
    await expect(forwardFailureCode()).resolves.toBe('UNREACHABLE');

    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"code":"SOMETHING_ELSE"}', { status: 500 })));
    await expect(forwardFailureCode()).resolves.toBe('UNREACHABLE');
  });

  it('reads our api being down as UNREACHABLE', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));

    await expect(forwardFailureCode()).resolves.toBe('UNREACHABLE');
  });

  it('asks for the href and returns the forwarded page', async () => {
    const forwardedPage = { url: 'https://acme.com/terms', title: 'Terms', root: { id: 'main:1', kind: 'main', tag: 'main', children: [] } };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(forwardedPage), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchForwardedPage('https://acme.com/terms')).resolves.toEqual(forwardedPage);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/forward', expect.objectContaining({ body: '{"url":"https://acme.com/terms"}' }));
  });
});
