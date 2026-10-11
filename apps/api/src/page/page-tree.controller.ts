import { Controller, Post } from '@nestjs/common';
import type { PageTree } from '@ax/core';
import { z } from 'zod';
import { ZodBody } from '../common/zod-body.decorator.js';
import { PageTreeService } from './page-tree.service.js';

const pageTreeRequestSchema = z.object({ url: z.string().min(1) });
type PageTreeRequest = z.infer<typeof pageTreeRequestSchema>;

@Controller('page-tree')
export class PageTreeController {
  constructor(private readonly pageTreeService: PageTreeService) {}

  @Post()
  getPageTree(@ZodBody(pageTreeRequestSchema) request: PageTreeRequest): Promise<PageTree> {
    return this.pageTreeService.getPageTree(request.url);
  }
}
