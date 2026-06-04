import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { detailDelegate } from '../common/prisma-delegate';
import { buildDetailData, DETAIL_DELEGATE } from '../events/event-mapper';
import { CsvRow, EVENT_MAP, mapDetails, parseCsv, rowHash, uniqueKey, zonedNaiveToUtc } from './csv-mapper';
import type { EventType } from '@acme/baby-bot-domain';

/** Fallback when no zone is supplied: preserves the historical behaviour of
 * treating naive CSV datetimes as UTC. */
const DEFAULT_TZ = 'UTC';

export interface ImportResult {
  filesProcessed: number;
  rowsTotal: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger('CsvImportService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /** Import a single CSV buffer (used by the upload endpoint). `timeZone` is an
   * IANA zone (e.g. `Europe/Moscow`) identifying the wall-clock zone the CSV
   * timestamps are recorded in; they are converted to UTC for storage. */
  async importBuffer(content: string, fileName: string, childId = 1, timeZone = DEFAULT_TZ): Promise<ImportResult> {
    const result: ImportResult = { filesProcessed: 1, rowsTotal: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };
    const rows = parseCsv(content);
    result.rowsTotal = rows.length;
    for (const row of rows) {
      if (!row.datetime || !row.event) continue;
      if (!EVENT_MAP[row.event]) {
        result.errors.push(`Unknown event: ${row.event}`);
        continue;
      }
      try {
        const outcome = await this.processRow(row, fileName, childId, timeZone);
        result[outcome]++;
      } catch (err) {
        result.errors.push(`Row ${row.datetime} ${row.event}: ${(err as Error).message}`);
      }
    }
    return result;
  }

  private async processRow(
    row: CsvRow,
    fileName: string,
    childId: number,
    timeZone: string,
  ): Promise<'inserted' | 'updated' | 'skipped'> {
    const mapped = mapDetails(row);
    // Convert every naive timestamp (event time + detail start/end) from the
    // source zone to UTC so all of an event's instants stay consistent and land
    // on the correct calendar day when rendered back in the user's zone.
    for (const field of ['started_at', 'ended_at'] as const) {
      const v = mapped.details?.[field];
      if (typeof v === 'string') {
        const utc = zonedNaiveToUtc(v, timeZone);
        mapped.details![field] = utc ? utc.toISOString() : null;
      }
    }
    const key = uniqueKey(row);
    const hash = rowHash(row, timeZone);
    const occurredAt = zonedNaiveToUtc(row.datetime, timeZone) ?? new Date(row.datetime.replace(' ', 'T'));
    const note = mapped.note || row.comment || null;
    const delegate = DETAIL_DELEGATE[mapped.eventType as EventType];

    const existing = await this.prisma.csvImport.findUnique({ where: { uniqueKey: key } });
    if (existing && existing.rowHash === hash) return 'skipped';

    if (existing?.eventId) {
      const old = await this.prisma.event.findUnique({ where: { id: existing.eventId } });
      if (old) {
        const oldDelegate = DETAIL_DELEGATE[old.eventType as EventType];
        if (oldDelegate) await detailDelegate(this.prisma, oldDelegate).deleteMany({ where: { eventId: old.id } });
        await this.prisma.event.update({
          where: { id: existing.eventId },
          data: { eventType: mapped.eventType as never, occurredAt, note },
        });
        if (mapped.details && delegate) {
          await detailDelegate(this.prisma, delegate).create({
            data: { eventId: existing.eventId, ...buildDetailData(mapped.details) },
          });
        }
      }
      await this.prisma.csvImport.update({ where: { uniqueKey: key }, data: { rowHash: hash, fileName, eventId: existing.eventId } });
      return 'updated';
    }

    const event = await this.prisma.event.create({
      data: { childId, eventType: mapped.eventType as never, occurredAt, source: 'csv_import', note },
    });
    if (mapped.details && delegate) {
      await detailDelegate(this.prisma, delegate).create({
        data: { eventId: event.id, ...buildDetailData(mapped.details) },
      });
    }
    await this.prisma.csvImport.create({ data: { uniqueKey: key, eventId: event.id, fileName, rowHash: hash } });
    return 'inserted';
  }

  /** Scan CSV_DIR for new/changed files (mtime-tracked) and import them. */
  async importAll(childId = 1): Promise<ImportResult> {
    const result: ImportResult = { filesProcessed: 0, rowsTotal: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };
    const dir = path.resolve(this.config.csvDir);
    if (!fs.existsSync(dir)) return result;

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.csv')).sort();
    for (const fileName of files) {
      const filePath = path.join(dir, fileName);
      const mtime = Math.floor(fs.statSync(filePath).mtimeMs);
      const state = await this.prisma.csvImportState.findUnique({ where: { fileName } });
      if (state && Number(state.lastMtimeMs) >= mtime) continue;

      const fileResult = await this.importBuffer(fs.readFileSync(filePath, 'utf-8'), fileName, childId, this.config.importTimeZone);
      await this.prisma.csvImportState.upsert({
        where: { fileName },
        update: { lastMtimeMs: BigInt(mtime) },
        create: { fileName, lastMtimeMs: BigInt(mtime) },
      });
      result.filesProcessed++;
      result.rowsTotal += fileResult.rowsTotal;
      result.inserted += fileResult.inserted;
      result.updated += fileResult.updated;
      result.skipped += fileResult.skipped;
      result.errors.push(...fileResult.errors);
    }
    return result;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledImport(): Promise<void> {
    try {
      const r = await this.importAll();
      if (r.filesProcessed) this.logger.log(`CSV autoimport: ${r.inserted} new, ${r.updated} updated, ${r.skipped} skipped`);
    } catch (err) {
      this.logger.warn(`CSV autoimport failed: ${(err as Error).message}`);
    }
  }
}
