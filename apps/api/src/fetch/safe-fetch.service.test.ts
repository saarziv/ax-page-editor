import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchError } from './fetch-error.js';
import { SafeFetchService } from './safe-fetch.service.js';

const MB = 1024 * 1024;
const encoder = new TextEncoder();

type FakeResponse = {
  status?: number;
  headers?: Record<string, string>;
  /** The body, sent in these chunks. */
  chunks?: Uint8Array[];
  /** Send the chunks, then never finish the body (a site that stalls mid-page). */
  stallAfterChunks?: boolean;
  /** `response.url` after redirects. Defaults to the requested url. */
  finalUrl?: string;
};

/** Fakes the network: answers every request with `fake`, honoring the abort signal like real fetch. */
function fakeFetch(fake: FakeResponse | (() => Promise<never>)) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    if (typeof fake === 'function') return fake();
    const signal = init?.signal ?? undefined;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of fake.chunks ?? []) controller.enqueue(chunk);
        if (fake.stallAfterChunks) {
          signal?.addEventListener('abort', () => controller.error(signal.reason));
        } else {
          controller.close();
        }
      },
    });
    const response = new Response(body, { status: fake.status ?? 200, headers: fake.headers });
    Object.defineProperty(response, 'url', { value: fake.finalUrl ?? String(input) });
    return response;
  });
}

function htmlResponse(html: string, extra: FakeResponse = {}): FakeResponse {
  return { headers: { 'content-type': 'text/html; charset=utf-8' }, chunks: [encoder.encode(html)], ...extra };
}

async function fetchErrorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof FetchError) return error.code;
    throw error;
  }
  throw new Error('Expected fetchHtml to reject');
}

const service = new SafeFetchService();

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SafeFetchService.fetchHtml', () => {
  it('returns the html and the final url', async () => {
    fakeFetch(htmlResponse('<h1>Hi</h1>', { finalUrl: 'https://site.com/new/' }));
    await expect(service.fetchHtml('https://site.com/old')).resolves.toEqual({
      finalUrl: 'https://site.com/new/',
      html: '<h1>Hi</h1>',
    });
  });

  it('refuses anything but http(s) before fetching', async () => {
    const fetchSpy = fakeFetch(htmlResponse('<p>x</p>'));
    expect(await fetchErrorCode(service.fetchHtml('file:///etc/passwd'))).toBe('INVALID_URL');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('decodes the body with the charset from content-type', async () => {
    fakeFetch({
      headers: { 'content-type': 'text/html; charset=iso-8859-1' },
      chunks: [new Uint8Array([0x63, 0x61, 0x66, 0xe9])], // "café" in Latin-1
    });
    expect((await service.fetchHtml('https://site.com')).html).toBe('café');
  });

  it('falls back to utf-8 when the charset is unknown', async () => {
    fakeFetch({ headers: { 'content-type': 'text/html; charset=nonsense' }, chunks: [encoder.encode('café')] });
    expect((await service.fetchHtml('https://site.com')).html).toBe('café');
  });

  describe('timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('gives TIMEOUT when the site never answers', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
          }),
      );
      const result = fetchErrorCode(service.fetchHtml('https://slow.com'));
      await vi.advanceTimersByTimeAsync(10_000);
      expect(await result).toBe('TIMEOUT');
    });

    it('gives TIMEOUT when the headers are fast but the body is slow', async () => {
      fakeFetch(htmlResponse('<p>first bytes', { stallAfterChunks: true }));
      const result = fetchErrorCode(service.fetchHtml('https://slow.com'));
      await vi.advanceTimersByTimeAsync(10_000);
      expect(await result).toBe('TIMEOUT');
    });
  });

  describe('size', () => {
    it('gives TOO_LARGE from content-length alone', async () => {
      fakeFetch(htmlResponse('<p>small lie</p>', { headers: { 'content-type': 'text/html', 'content-length': String(4 * MB) } }));
      expect(await fetchErrorCode(service.fetchHtml('https://big.com'))).toBe('TOO_LARGE');
    });

    it('gives TOO_LARGE by counting bytes when content-length is missing', async () => {
      const oneMb = new Uint8Array(MB);
      fakeFetch({ headers: { 'content-type': 'text/html' }, chunks: [oneMb, oneMb, oneMb, oneMb] });
      expect(await fetchErrorCode(service.fetchHtml('https://big.com'))).toBe('TOO_LARGE');
    });

    it('accepts a page of exactly 3 MB', async () => {
      fakeFetch({ headers: { 'content-type': 'text/html' }, chunks: [new Uint8Array(3 * MB)] });
      expect((await service.fetchHtml('https://big.com')).html).toHaveLength(3 * MB);
    });
  });

  describe('content type', () => {
    it('gives NOT_HTML for a PDF', async () => {
      fakeFetch({ headers: { 'content-type': 'application/pdf' }, chunks: [encoder.encode('%PDF-1.7')] });
      expect(await fetchErrorCode(service.fetchHtml('https://site.com/file.pdf'))).toBe('NOT_HTML');
    });

    it('gives NOT_HTML when content-type is missing', async () => {
      fakeFetch({ chunks: [encoder.encode('<p>?</p>')] });
      expect(await fetchErrorCode(service.fetchHtml('https://site.com'))).toBe('NOT_HTML');
    });

    it('accepts text/html regardless of case and parameters', async () => {
      fakeFetch(htmlResponse('<p>ok</p>', { headers: { 'content-type': 'Text/HTML;charset=UTF-8' } }));
      expect((await service.fetchHtml('https://site.com')).html).toBe('<p>ok</p>');
    });
  });

  describe('unreachable', () => {
    it('gives UNREACHABLE when the domain does not exist', async () => {
      fakeFetch(() => Promise.reject(new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND') })));
      expect(await fetchErrorCode(service.fetchHtml('https://no-such-site.invalid'))).toBe('UNREACHABLE');
    });

    it('gives UNREACHABLE when the site answers 404, even with an html body', async () => {
      fakeFetch(htmlResponse('<h1>Not found</h1>', { status: 404 }));
      expect(await fetchErrorCode(service.fetchHtml('https://site.com/missing'))).toBe('UNREACHABLE');
    });

    it('lets unexpected errors propagate as bugs, not as a FetchError', async () => {
      fakeFetch(() => Promise.reject(new RangeError('a bug')));
      await expect(service.fetchHtml('https://site.com')).rejects.toBeInstanceOf(RangeError);
    });
  });
});
