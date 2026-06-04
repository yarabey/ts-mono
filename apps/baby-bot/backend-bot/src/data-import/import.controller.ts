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
      // `realm` is a heavy, deprecated native module kept OUT of the served
      // backend (ADR 0007). Persist the upload into the data volume so an
      // operator can run the offline `realm-import` Nx target against the DB;
      // see src/data-import/README.md.
      const dir = path.resolve(this.config.realmDir);
      fs.mkdirSync(dir, { recursive: true });
      const stored = path.join(dir, path.basename(filename));
      fs.writeFileSync(stored, buffer);
      this.logger.log(`Realm upload ${filename} stored at ${stored} (offline import pending)`);
      return {
        type: 'realm',
        message: 'Realm-файл сохранён. Импорт выполняется офлайн администратором (см. data-import/README.md).',
        stored,
      };
    }

    throw new BadRequestException('Unsupported file type (expected .csv or .realm)');
  }
}
