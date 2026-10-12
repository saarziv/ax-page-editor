import { Injectable } from '@nestjs/common';
import { renderMarkdown } from '@ax/core';
import { PageTreeService } from '../page/page-tree.service.js';

/** What an agent gets for a page: the live page, cleaned exactly as the editor sees it, as Markdown. */
@Injectable()
export class AgentViewService {
  constructor(private readonly pageTreeService: PageTreeService) {}

  async getAgentViewMarkdown(rawUrl: string): Promise<string> {
    const pageTree = await this.pageTreeService.getPageTree(rawUrl);
    return renderMarkdown(pageTree.root);
  }
}
