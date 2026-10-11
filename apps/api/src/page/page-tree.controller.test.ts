import { describe, expect, it } from 'vitest';
import { FetchError } from '../fetch/fetch-error.js';
import { PageTreeController } from './page-tree.controller.js';

const controller = new PageTreeController();

describe('PageTreeController', () => {
  it('returns the tree under the normalized url', () => {
    expect(controller.getPageTree({ url: 'HTTPS://Example.com/page/?utm_source=x#top' }).url).toBe(
      'https://example.com/page',
    );
  });

  it('turns an invalid url into a 400 INVALID_URL FetchError', () => {
    let thrown: unknown;
    try {
      controller.getPageTree({ url: 'ftp://x' });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(FetchError);
    expect((thrown as FetchError).getStatus()).toBe(400);
    expect((thrown as FetchError).getResponse()).toEqual({
      code: 'INVALID_URL',
      message: expect.stringContaining('ftp://x'),
    });
  });
});
