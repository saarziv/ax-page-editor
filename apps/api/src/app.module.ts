import { Module } from '@nestjs/common';
import { ConfigsController } from './config/configs.controller.js';
import { SafeFetchService } from './fetch/safe-fetch.service.js';
import { HealthController } from './health/health.controller.js';
import { SnapshotController } from './page/snapshot.controller.js';

@Module({
  controllers: [HealthController, SnapshotController, ConfigsController],
  providers: [SafeFetchService],
})
export class AppModule {}
