import { Module } from '@nestjs/common';
import { AgentViewController } from './agent-view/agent-view.controller.js';
import { AgentViewService } from './agent-view/agent-view.service.js';
import { ConfigRepository, openConfigDatabase } from './config/config.repository.js';
import { ConfigsController } from './config/configs.controller.js';
import { loadEnv } from './config/env.js';
import { SafeFetchService } from './fetch/safe-fetch.service.js';
import { ForwardController } from './forward/forward.controller.js';
import { ForwardService } from './forward/forward.service.js';
import { HealthController } from './health/health.controller.js';
import { PageTreeController } from './page/page-tree.controller.js';
import { PageTreeService } from './page/page-tree.service.js';

@Module({
  controllers: [HealthController, PageTreeController, ConfigsController, AgentViewController, ForwardController],
  providers: [
    SafeFetchService,
    PageTreeService,
    ForwardService,
    AgentViewService,
    { provide: ConfigRepository, useFactory: () => new ConfigRepository(openConfigDatabase(loadEnv().DB_PATH)) },
  ],
})
export class AppModule {}
