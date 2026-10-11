import { Controller, Post } from '@nestjs/common';
import type { PageTree } from '@ax/core';
import { z } from 'zod';
import { ZodBody } from '../common/zod-body.decorator.js';

const pageTreeRequestSchema = z.object({ url: z.string().min(1) });
type PageTreeRequest = z.infer<typeof pageTreeRequestSchema>;

@Controller('page-tree')
export class PageTreeController {
  // Stub: echoes the url so the web can be wired end to end. The real pipeline lands in T03 S2–S5.
  @Post()
  getPageTree(@ZodBody(pageTreeRequestSchema) request: PageTreeRequest): PageTree {
    return {
      url: request.url,
      title: 'Stub page',
      root: { id: 'main:1', kind: 'main', tag: 'main' },
      isNearlyEmpty: false,
    };
  }
}
