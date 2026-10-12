import { BadRequestException, Controller, Get, Put } from '@nestjs/common';
import { InvalidUrlError, normalizeUrl, saveConfigRequestSchema, type Config, type SaveConfigRequest, type SavedPageSummary } from '@ax/core';
import { ZodBody } from '../common/zod-body.decorator.js';
import { ConfigRepository } from './config.repository.js';

@Controller('configs')
export class ConfigsController {
  constructor(private readonly configRepository: ConfigRepository) {}

  @Get()
  listSummaries(): SavedPageSummary[] {
    return this.configRepository.listSummaries();
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
