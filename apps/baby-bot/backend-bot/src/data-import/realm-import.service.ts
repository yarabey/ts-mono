import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { emptyRealmResult, importRealmFile, loadRealm, type RealmImportResult } from './realm-importer';

/**
 * Imports uploaded Realm databases in-process. The native `realm` module is
 * loaded lazily (and stays out of the served bundle — see ADR 0007); when it
 * isn't installed, `importBuffer` throws a clear error the controller surfaces.
 */
@Injectable()
export class RealmImportService {
  private readonly logger = new Logger('RealmImportService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /** Persist the uploaded `.realm` file and import its events. */
  async importBuffer(buffer: Buffer, fileName: string, childId = 1): Promise<RealmImportResult> {
    const dir = path.resolve(this.config.realmDir);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, path.basename(fileName));
    fs.writeFileSync(filePath, buffer);

    const Realm = await loadRealm();
    const result = emptyRealmResult();
    result.filesProcessed = 1;
    await importRealmFile(this.prisma, Realm, filePath, childId, result);
    this.logger.log(`Realm import ${fileName}: ${result.inserted} new, ${result.updated} updated, ${result.errors.length} errors`);
    return result;
  }
}
