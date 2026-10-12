import { Controller, Get } from '@nestjs/common';

export type RecentConfig = { url: string; updatedAt: string; count: number };

@Controller('configs')
export class ConfigsController {
  // Stub: the repository that backs the recent list is built in 04.
  @Get()
  listRecent(): RecentConfig[] {
    return [];
  }
}
