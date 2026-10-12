import { Module } from '@nestjs/common';
import { ConfigRepository, openConfigDatabase } from './config/config.repository.js';
import { ConfigsController } from './config/configs.controller.js';
import { loadEnv } from './config/env.js';
import { SafeFetchService } from './fetch/safe-fetch.service.js';
import { HealthController } from './health/health.controller.js';
import { PageTreeController } from './page/page-tree.controller.js';
import { PageTreeService } from './page/page-tree.service.js';

@Module({
  controllers: [HealthController, PageTreeController, ConfigsController],
  providers: [
    SafeFetchService,
    PageTreeService,
    { provide: ConfigRepository, useFactory: () => new ConfigRepository(openConfigDatabase(loadEnv().DB_PATH)) },
  ],
})
export class AppModule {}
