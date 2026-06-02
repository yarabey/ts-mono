import { Injectable } from '@nestjs/common';

/**
 * Typed accessor over all environment configuration for the bot backend.
 * Reads `process.env` (populated by `ConfigModule.forRoot`, which loads `.env`)
 * so services depend on this typed surface rather than raw env vars.
 */
@Injectable()
export class AppConfigService {
  private str(key: string, fallback = ''): string {
    return process.env[key] ?? fallback;
  }

  private bool(key: string, fallback = false): boolean {
    const v = process.env[key];
    if (v === undefined) return fallback;
    return v === 'true' || v === '1';
  }

  // Server
  get port(): number {
    return Number(this.str('PORT', '3100'));
  }

  // Auth
  get jwtSecret(): string {
    return this.str('JWT_SECRET', 'dev-secret');
  }
  get accessCode(): string {
    return this.str('ACCESS_CODE');
  }

  // Telegram
  get telegramBotToken(): string {
    return this.str('TELEGRAM_BOT_TOKEN');
  }
  get telegramSocks5Proxy(): string {
    return this.str('TELEGRAM_SOCKS5_PROXY');
  }
  get miniAppUrl(): string {
    return this.str('MINI_APP_URL');
  }

  // AI / transcription
  get openaiApiKey(): string {
    return this.str('OPENAI_API_KEY');
  }
  get zaiApiKey(): string {
    return this.str('ZAI_API_KEY');
  }
  get zaiBaseUrl(): string {
    return this.str('ZAI_BASE_URL', 'https://api.z.ai/v1');
  }
  get zaiModel(): string {
    return this.str('ZAI_MODEL', 'glm-4.5');
  }

  // Filesystem
  get dataDir(): string {
    return this.str('DATA_DIR', './data');
  }
  get csvDir(): string {
    return this.str('CSV_DIR', './csv');
  }
  get realmDir(): string {
    return this.str('REALM_DIR', './data/realm');
  }
  get uploadsDir(): string {
    return this.str('UPLOADS_DIR', './data/uploads');
  }

  // Feature flags
  get markdownDiaryEnabled(): boolean {
    return this.bool('MARKDOWN_DIARY_ENABLED', false);
  }

  // Derived capability flags
  get telegramEnabled(): boolean {
    return this.telegramBotToken.length > 0;
  }
  get aiEnabled(): boolean {
    return this.zaiApiKey.length > 0;
  }
}
