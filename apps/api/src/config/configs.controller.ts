import { BadRequestException, Controller, Get, Put } from '@nestjs/common';
import { InvalidUrlError, normalizeUrl, saveConfigRequestSchema, type Config, type SaveConfigRequest } from '@ax/core';
import { ZodBody } from '../common/zod-body.decorator.js';
import { ConfigRepository } from './config.repository.js';

export type RecentConfig = { url: string; updatedAt: string; count: number };

@Controller('configs')
export class ConfigsController {
  constructor(private readonly configRepository: ConfigRepository) {}

  // Stub: the repository that backs the recent list is built in 04.
  @Get()
  listRecent(): RecentConfig[] {
    return [];
  }

  // The server sets version and updatedAt, and normalizes the url, so every client saves under the same key and one clock orders saves.
  @Put()
  save(@ZodBody(saveConfigRequestSchema) request: SaveConfigRequest): Config {
    const config: Config = {
      version: 1,
      url: normalizeSaveUrl(request.url),
      updatedAt: new Date().toISOString(),
      modifications: request.modifications,
    };
    this.configRepository.save(config);
    return config;
  }
}

function normalizeSaveUrl(rawUrl: string): string {
  try {
    return normalizeUrl(rawUrl);
  } catch (error) {
    if (error instanceof InvalidUrlError) throw new BadRequestException({ code: 'INVALID_REQUEST', message: error.message });
    throw error;
  }
}
