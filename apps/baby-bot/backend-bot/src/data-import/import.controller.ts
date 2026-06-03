import { BadRequestException, Controller, Logger, Post, Req } from '@nestjs/common';
import '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { CsvImportService } from './csv-import.service';
import { RealmImportService } from './realm-import.service';

@Controller('api/import')
export class ImportController {
  private readonly logger = new Logger('ImportController');

  constructor(
    private readonly csv: CsvImportService,
    private readonly realm: RealmImportService,
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
      try {
        const result = await this.realm.importBuffer(buffer, filename);
        return { type: 'realm', ...result };
      } catch (err) {
        // e.g. the optional native `realm` module isn't installed in this env.
        throw new BadRequestException((err as Error).message);
      }
    }

    throw new BadRequestException('Unsupported file type (expected .csv or .realm)');
  }
}
