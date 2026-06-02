import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.enableCors();

  // 10 MB photo/import upload limit (parity with original baby-ai).
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  const config = app.get(AppConfigService);
  await app.listen(config.port, '0.0.0.0');
  Logger.log(`baby-bot backend listening on :${config.port}`, 'Bootstrap');
}

bootstrap();
