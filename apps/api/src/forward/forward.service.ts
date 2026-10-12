import { Injectable } from '@nestjs/common';
import { mainContent, type PageTree } from '@ax/core';
import { PageTreeService } from '../page/page-tree.service.js';

/**
 * A forwarded link's page: loaded like any page, so every SafeFetch check applies, then cut to its main content.
 * Not truncated here: markModificationsInTree does that, so the editor and Agent View cut at the same place.
 */
@Injectable()
export class ForwardService {
  constructor(private readonly pageTreeService: PageTreeService) {}

  async getForwardedPage(rawUrl: string): Promise<PageTree> {
    const pageTree = await this.pageTreeService.getPageTree(rawUrl);
    return { ...pageTree, root: mainContent(pageTree.root) };
  }
}
