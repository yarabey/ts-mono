import { BadRequestException, Controller, Logger, Post, Req } from '@nestjs/common';
import '@fastify/multipart';
import * as fs from 'fs';
import * as path from 'path';
import type { FastifyRequest } from 'fastify';
import { CsvImportService } from './csv-import.service';
import { AppConfigService } from '../config/app-config.service';

@Controller('api/import')
export class ImportController {
  private readonly logger = new Logger('ImportController');

  constructor(
    private readonly csv: CsvImportService,
    private readonly config: AppConfigService,
  ) {}

  @Post('upload')
  async upload(@Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) throw new BadRequestException('No file uploaded');
    const filename = data.filename ?? 'upload';
    const buffer = await data.toBuffer();

    if (filename.toLowerCase().endsWith('.csv')) {
      const result = await this.csv.importBuffer(buffer.toString('utf-8'), filename);
      this.logger.log(`CSV upload ${filename}: +${result.inserted}/${result.updated} (${result.skipped} skipped)`);
      return { type: 'csv', ...result };
    }

    if (filename.toLowerCase().endsWith('.realm')) {
      // Realm is a heavy native module isolated to a one-shot script (kept out
      // of the served bundle). Persist the upload and point at the Nx target.
      const dir = path.resolve(this.config.realmDir);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, filename), buffer);
      return {
        type: 'realm',
        message: 'Realm file stored. Run `pnpm nx run baby-bot-backend-bot:realm-import` to import it.',
        stored: path.join(dir, filename),
      };
    }

    throw new BadRequestException('Unsupported file type (expected .csv or .realm)');
  }
}
