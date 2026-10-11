import { Injectable } from '@nestjs/common';
import { clean, InvalidUrlError, normalizeUrl, type PageTree } from '@ax/core';
import { FetchError } from '../fetch/fetch-error.js';
import { SafeFetchService } from '../fetch/safe-fetch.service.js';
import { loadSample, SAMPLE_PREFIX } from './demo-loader.js';

function normalizeRequestUrl(rawUrl: string): string {
  try {
    return normalizeUrl(rawUrl);
  } catch (error) {
    if (error instanceof InvalidUrlError) throw new FetchError('INVALID_URL', error.message);
    throw error;
  }
}

@Injectable()
export class PageTreeService {
  constructor(private readonly safeFetch: SafeFetchService) {}

  async getPageTree(rawUrl: string): Promise<PageTree> {
    const url = normalizeRequestUrl(rawUrl);
    if (url.startsWith(SAMPLE_PREFIX)) return clean(await loadSample(url), url);

    const { finalUrl, html } = await this.safeFetch.fetchHtml(url);
    // Relative links resolve against the address the browser would use (`/docs/` + `intro` →
    // `/docs/intro`), but the tree is keyed by the normalized one, where configurations are saved.
    return { ...clean(html, finalUrl), url: normalizeRequestUrl(finalUrl) };
  }
}
