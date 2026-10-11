import { Controller, Get } from '@nestjs/common';
import { CORE_VERSION } from '@ax/core';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { ok: true; core: string } {
    return { ok: true, core: CORE_VERSION };
  }
}
