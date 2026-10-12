import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveConfig, SAVE_TIMEOUT_MS } from './queries';

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
    await vi.advanceTimersByTimeAsync(SAVE_TIMEOUT_MS);

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
    await vi.advanceTimersByTimeAsync(SAVE_TIMEOUT_MS - 1);

    expect(aborted).toBe(false);
  });
});
