import { Controller, Post } from '@nestjs/common';
import type { PageTree } from '@ax/core';
import { z } from 'zod';
import { ZodBody } from '../common/zod-body.decorator.js';
import { ForwardService } from './forward.service.js';

const forwardRequestSchema = z.object({ url: z.string().min(1) });
type ForwardRequest = z.infer<typeof forwardRequestSchema>;

@Controller('forward')
export class ForwardController {
  constructor(private readonly forwardService: ForwardService) {}

  @Post()
  getForwardedPage(@ZodBody(forwardRequestSchema) request: ForwardRequest): Promise<PageTree> {
    return this.forwardService.getForwardedPage(request.url);
  }
}
