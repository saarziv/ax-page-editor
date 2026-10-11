import { Injectable } from '@nestjs/common';
import { clean, InvalidUrlError, normalizeUrl, type PageTree } from '@ax/core';
import { FetchError } from '../fetch/fetch-error.js';
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
  async getPageTree(rawUrl: string): Promise<PageTree> {
    const url = normalizeRequestUrl(rawUrl);
    if (url.startsWith(SAMPLE_PREFIX)) return clean(await loadSample(url), url);

    // Stub tree for real URLs: fetching lands in T03 S4.
    return { url, title: 'Stub page', root: { id: '', kind: 'page', tag: 'body' } };
  }
}
