import { Controller, Post } from '@nestjs/common';
import type { PageTree } from '@ax/core';
import { z } from 'zod';
import { ZodBody } from '../common/zod-body.decorator.js';

const snapshotRequestSchema = z.object({ url: z.string().min(1) });
type SnapshotRequest = z.infer<typeof snapshotRequestSchema>;

@Controller('snapshot')
export class SnapshotController {
  // Stub: echoes the url so the web can be wired end to end. Real snapshot lands in T05/T08.
  @Post()
  createSnapshot(@ZodBody(snapshotRequestSchema) request: SnapshotRequest): PageTree {
    return {
      url: request.url,
      title: 'Stub page',
      root: { id: 'main:1', kind: 'main', tag: 'main' },
      isNearlyEmpty: false,
    };
  }
}
