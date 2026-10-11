import { Controller, Post } from '@nestjs/common';
import { InvalidUrlError, normalizeUrl, type PageTree } from '@ax/core';
import { z } from 'zod';
import { ZodBody } from '../common/zod-body.decorator.js';
import { FetchError } from '../fetch/fetch-error.js';

const pageTreeRequestSchema = z.object({ url: z.string().min(1) });
type PageTreeRequest = z.infer<typeof pageTreeRequestSchema>;

function normalizeRequestUrl(rawUrl: string): string {
  try {
    return normalizeUrl(rawUrl);
  } catch (error) {
    if (error instanceof InvalidUrlError) throw new FetchError('INVALID_URL', error.message);
    throw error;
  }
}

@Controller('page-tree')
export class PageTreeController {
  // Stub tree: fetching and cleaning land in T03 S3–S5.
  @Post()
  getPageTree(@ZodBody(pageTreeRequestSchema) request: PageTreeRequest): PageTree {
    return {
      url: normalizeRequestUrl(request.url),
      title: 'Stub page',
      root: { id: 'main:1', kind: 'main', tag: 'main' },
      isNearlyEmpty: false,
    };
  }
}
