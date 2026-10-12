import { Injectable } from '@nestjs/common';
import { FetchError } from './fetch-error.js';

export type FetchedHtml = { finalUrl: string; html: string };

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;

/** The only way the server fetches a URL (plan.md §4.1). */
@Injectable()
export class SafeFetchService {
  async fetchHtml(url: string): Promise<FetchedHtml> {
    assertHttpUrl(url);

    // One timer for the headers and the body: a site can answer fast, then send the body a byte at a time.
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: timeoutController.signal, redirect: 'follow' });
      return { finalUrl: response.url || url, html: await readHtml(response, url) };
    } catch (error) {
      if (error instanceof FetchError) throw error;
      if (timeoutController.signal.aborted) {
        throw new FetchError('TIMEOUT', `No complete answer within ${TIMEOUT_MS / 1000}s from ${url}`);
      }
      // Node's fetch reports every network failure (unknown domain, refused, reset) as a TypeError.
      if (error instanceof TypeError) {
        throw new FetchError('UNREACHABLE', `Could not reach ${url}: ${describeCause(error)}`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

function assertHttpUrl(url: string): void {
  let protocol: string;
  try {
    protocol = new URL(url).protocol;
  } catch {
    throw new FetchError('INVALID_URL', `Not a valid URL: ${JSON.stringify(url)}`);
  }
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new FetchError('INVALID_URL', `Only http(s) URLs can be fetched: ${JSON.stringify(url)}`);
  }
}

/** Checks status and headers before reading, so a 404 or a PDF is refused without downloading it. */
async function readHtml(response: Response, url: string): Promise<string> {
  // An error page must never become a page a publisher configures.
  if (!response.ok) {
    await response.body?.cancel();
    throw new FetchError('UNREACHABLE', `${url} answered with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const mediaType = contentType.split(';')[0]?.trim().toLowerCase();
  if (mediaType !== 'text/html') {
    await response.body?.cancel();
    throw new FetchError('NOT_HTML', `${url} is ${JSON.stringify(contentType || 'missing a content-type')}, not text/html`);
  }

  // content-length may be missing or wrong, so it's only an early exit; readBody counts the real bytes.
  const declaredLength = Number(response.headers.get('content-length'));
  if (declaredLength > MAX_BYTES) {
    await response.body?.cancel();
    throw tooLarge(url);
  }

  const bodyBytes = await readBody(response, url);
  return decoderFor(contentType).decode(bodyBytes);
}

async function readBody(response: Response, url: string): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BYTES) {
      await reader.cancel();
      throw tooLarge(url);
    }
    chunks.push(value);
  }

  const bodyBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bodyBytes;
}

function tooLarge(url: string): FetchError {
  return new FetchError('TOO_LARGE', `${url} is larger than ${MAX_BYTES / 1024 / 1024} MB`);
}

function decoderFor(contentType: string): TextDecoder {
  const charset = /charset=["']?([^;"'\s]+)/i.exec(contentType)?.[1];
  if (charset) {
    try {
      return new TextDecoder(charset);
    } catch (error) {
      // An unknown label throws a RangeError. Most of the web is UTF-8, so that's the best guess.
      if (!(error instanceof RangeError)) throw error;
    }
  }
  return new TextDecoder('utf-8');
}

/** Node's "fetch failed" says nothing; the cause holds the real reason (e.g. ENOTFOUND). */
function describeCause(error: TypeError): string {
  return error.cause instanceof Error ? error.cause.message : error.message;
}
