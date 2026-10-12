import { Injectable } from '@nestjs/common';
import { markModificationsInTree, prune, renderMarkdown, type Forwarded, type Modification } from '@ax/core';
import { ConfigRepository } from '../config/config.repository.js';
import { FetchError } from '../fetch/fetch-error.js';
import { ForwardService } from '../forward/forward.service.js';
import { PageTreeService } from '../page/page-tree.service.js';

/**
 * What an agent gets for a page: the live page with its saved configuration applied, as Markdown.
 * The editor's own chain (clean, then markModificationsInTree), so it matches what the preview showed when saved.
 */
@Injectable()
export class AgentViewService {
  constructor(
    private readonly pageTreeService: PageTreeService,
    private readonly forwardService: ForwardService,
    private readonly configRepository: ConfigRepository,
  ) {}

  async getAgentViewMarkdown(rawUrl: string): Promise<string> {
    // Keyed by the normalized URL, so `?utm_source=x` finds the configuration saved for the clean address.
    const pageTree = await this.pageTreeService.getPageTree(rawUrl);
    const modifications = this.configRepository.findByUrl(pageTree.url)?.modifications ?? [];
    const forwardedPages = await this.fetchForwardedPages(modifications);
    // A modification that can't be resolved comes back unmatched and is simply not applied.
    const { tree: markedPage } = markModificationsInTree(pageTree.root, modifications, forwardedPages);
    return renderMarkdown(prune(markedPage));
  }

  // Fetched on every request, never cached, so the agent always reads each page's current content (D9).
  private async fetchForwardedPages(modifications: Modification[]): Promise<Map<string, Forwarded>> {
    const forwardedHrefs = new Set(modifications.flatMap((modification) => (modification.type === 'forward' ? [modification.href] : [])));
    const forwardedPages = await Promise.all([...forwardedHrefs].map((href) => this.fetchForwardedPage(href)));
    return new Map(forwardedPages.map((forwarded) => [forwarded.href, forwarded]));
  }

  // A page that fails to load leaves just the link for the agent (K7), and the forward stays saved so it works
  // again once the page is back. Any other error is a bug, so it still fails the request.
  private async fetchForwardedPage(href: string): Promise<Forwarded> {
    try {
      return { href, tree: await this.forwardService.getForwardedPage(href) };
    } catch (error) {
      if (error instanceof FetchError) return { href, error: error.code };
      throw error;
    }
  }
}
