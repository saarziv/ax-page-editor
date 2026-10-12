import { Controller, Get, Headers, Query, Res } from '@nestjs/common';
import { AgentViewService } from './agent-view.service.js';

/** The one thing this controller needs from the response, so it doesn't depend on Express types. */
export type HeaderSettableResponse = { setHeader(name: string, value: string): void };

// Outside the /api prefix (main.ts): it's the public address a consumer calls, not part of the editor's API.
@Controller('agentView')
export class AgentViewController {
  constructor(private readonly agentViewService: AgentViewService) {}

  @Get()
  async getAgentView(
    @Query('url') rawUrl: unknown,
    @Headers('accept') accept: string | undefined,
    @Res({ passthrough: true }) response: HeaderSettableResponse,
  ): Promise<string> {
    // A missing or repeated ?url= becomes '', which PageTreeService rejects as INVALID_URL.
    const markdown = await this.agentViewService.getAgentViewMarkdown(typeof rawUrl === 'string' ? rawUrl : '');
    response.setHeader('Content-Type', agentViewContentType(accept));
    response.setHeader('Vary', 'Accept');
    return markdown;
  }
}

// Browsers download text/markdown instead of showing it, so a browser tab (it asks for text/html) gets the same body as text/plain.
function agentViewContentType(accept: string | undefined): string {
  return accept?.includes('text/html') ? 'text/plain; charset=utf-8' : 'text/markdown; charset=utf-8';
}
