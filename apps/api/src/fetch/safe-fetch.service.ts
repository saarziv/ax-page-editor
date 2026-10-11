import { Injectable } from '@nestjs/common';

export type FetchedHtml = { finalUrl: string; html: string };

/** The only way the server fetches a URL. Stub until T08. */
@Injectable()
export class SafeFetchService {
  fetchHtml(url: string): Promise<FetchedHtml> {
    return Promise.reject(new Error(`SafeFetchService.fetchHtml is not implemented (url: ${url})`));
  }
}
