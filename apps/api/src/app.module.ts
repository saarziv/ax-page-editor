import { Module } from '@nestjs/common';
import { ConfigsController } from './config/configs.controller.js';
import { SafeFetchService } from './fetch/safe-fetch.service.js';
import { HealthController } from './health/health.controller.js';
import { PageTreeController } from './page/page-tree.controller.js';

@Module({
  controllers: [HealthController, PageTreeController, ConfigsController],
  providers: [SafeFetchService],
})
export class AppModule {}
