import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService } from '../config/app-config.service';

/**
 * Config-gated markdown-diary writer. The database `raw_entries` table is the
 * source of truth; when MARKDOWN_DIARY_ENABLED is set this additionally appends
 * each entry to a daily `YYYY-MM-DD.md` file (parity with original baby-ai).
 */
@Injectable()
export class DiaryService {
  private readonly logger = new Logger('DiaryService');

  constructor(private readonly config: AppConfigService) {}

  write(source: string, text: string, author = 'unknown', at: Date = new Date()): void {
    if (!this.config.markdownDiaryEnabled) return;
    try {
      const dir = this.config.dataDir;
      fs.mkdirSync(dir, { recursive: true });
      const day = at.toISOString().slice(0, 10);
      const time = at.toISOString().slice(11, 19);
      const filePath = path.join(dir, `${day}.md`);
      const entry = `\n## ${time}\n\n- source: ${source}\n- author: ${author}\n\n${text}\n\n`;
      fs.appendFileSync(filePath, entry, 'utf-8');
    } catch (err) {
      this.logger.warn(`Failed to write diary entry: ${(err as Error).message}`);
    }
  }
}
