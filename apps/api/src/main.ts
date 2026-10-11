import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // An array, not a string: with a string, cors sends that origin to every caller instead of
  // checking the request's Origin, so a foreign origin would still get the header.
  app.enableCors({ origin: [env.WEB_ORIGIN] });
  await app.listen(env.API_PORT);
}

void bootstrap();
