import { Injectable } from '@nestjs/common';
import { markModificationsInTree, prune, renderMarkdown } from '@ax/core';
import { ConfigRepository } from '../config/config.repository.js';
import { PageTreeService } from '../page/page-tree.service.js';

/**
 * What an agent gets for a page: the live page with its saved configuration applied, as Markdown.
 * The editor's own chain (clean, then markModificationsInTree), so it matches what the preview showed when saved.
 */
@Injectable()
export class AgentViewService {
  constructor(
    private readonly pageTreeService: PageTreeService,
    private readonly configRepository: ConfigRepository,
  ) {}

  async getAgentViewMarkdown(rawUrl: string): Promise<string> {
    // Keyed by the normalized URL, so `?utm_source=x` finds the configuration saved for the clean address.
    const pageTree = await this.pageTreeService.getPageTree(rawUrl);
    const modifications = this.configRepository.findByUrl(pageTree.url)?.modifications ?? [];
    // A modification that can't be resolved comes back unmatched and is simply not applied.
    const { tree: markedPage } = markModificationsInTree(pageTree.root, modifications);
    return renderMarkdown(prune(markedPage));
  }
}
