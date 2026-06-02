import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { SocksProxyAgent } from 'socks-proxy-agent';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { RawEntriesService } from '../raw-entries/raw-entries.service';
import { StatsService } from '../stats/stats.service';
import { QueryResponderService } from './query-responder.service';
import { detectIntent } from './intent-detector';

function formatDuration(totalMin: number): string {
  if (!totalMin) return '0 мин';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('TelegramService');
  private bot: TelegramBot | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly rawEntries: RawEntriesService,
    private readonly stats: StatsService,
    private readonly responder: QueryResponderService,
  ) {}

  onModuleInit(): void {
    if (!this.config.telegramEnabled) {
      this.logger.log('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled');
      return;
    }
    try {
      const proxy = this.config.telegramSocks5Proxy;
      const options: TelegramBot.ConstructorOptions = { polling: true };
      if (proxy) {
        const url = proxy.startsWith('socks') ? proxy : `socks5://${proxy}`;
        options.request = { agent: new SocksProxyAgent(url) } as never;
      }
      this.bot = new TelegramBot(this.config.telegramBotToken, options);
      this.registerHandlers(this.bot);
      if (this.config.miniAppUrl) {
        void this.bot.setChatMenuButton({
          menu_button: { type: 'web_app', text: 'Дневник', web_app: { url: this.config.miniAppUrl } },
        });
      }
      this.logger.log('Telegram bot started (polling)');
    } catch (err) {
      this.logger.error(`Failed to start Telegram bot: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot) await this.bot.stopPolling().catch(() => undefined);
  }

  /** Send a message if the bot is running (used by notifications & ai-processor). */
  async sendMessage(chatId: number, text: string): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.sendMessage(chatId, text);
    } catch (err) {
      this.logger.warn(`sendMessage failed: ${(err as Error).message}`);
    }
  }

  private async isAuthorized(chatId: number): Promise<boolean> {
    const row = await this.prisma.authorizedChat.findUnique({ where: { chatId: BigInt(chatId) } });
    return !!row;
  }

  private menuKeyboard() {
    return {
      reply_markup: {
        inline_keyboard: [[{ text: '📋 Открыть дневник', web_app: { url: this.config.miniAppUrl } }]],
      },
    };
  }

  private registerHandlers(bot: TelegramBot): void {
    bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      if (await this.isAuthorized(chatId)) {
        await bot.sendMessage(chatId, 'Дневник 🐣', this.config.miniAppUrl ? this.menuKeyboard() : undefined);
        return;
      }
      if (!this.config.accessCode) {
        await bot.sendMessage(chatId, 'Сервер не настроен. Обратитесь к администратору.');
        return;
      }
      const code = match?.[1]?.trim();
      if (code === this.config.accessCode) {
        await this.prisma.authorizedChat.upsert({
          where: { chatId: BigInt(chatId) },
          update: {},
          create: { chatId: BigInt(chatId) },
        });
        await bot.sendMessage(chatId, 'Код принят! Добро пожаловать 🐣', this.config.miniAppUrl ? this.menuKeyboard() : undefined);
      } else {
        await bot.sendMessage(chatId, 'Для доступа введите команду:\n\n/start КОД_ДОСТУПА');
      }
    });

    bot.onText(/\/notify$/, async (msg) => {
      if (!(await this.isAuthorized(msg.chat.id))) return;
      await this.prisma.userSetting.upsert({
        where: { userId_key: { userId: 1, key: 'notify_chat_id' } },
        update: { value: String(msg.chat.id) },
        create: { userId: 1, key: 'notify_chat_id', value: String(msg.chat.id) },
      });
      await bot.sendMessage(msg.chat.id, 'Уведомления включены. Пороги — в Mini App → Профиль.');
    });

    bot.onText(/\/notify_off/, async (msg) => {
      if (!(await this.isAuthorized(msg.chat.id))) return;
      await this.prisma.userSetting
        .delete({ where: { userId_key: { userId: 1, key: 'notify_chat_id' } } })
        .catch(() => undefined);
      await bot.sendMessage(msg.chat.id, 'Уведомления отключены.');
    });

    bot.onText(/\/help/, async (msg) => {
      if (!(await this.isAuthorized(msg.chat.id))) return;
      await bot.sendMessage(
        msg.chat.id,
        `🐣 Команды:\n\n/today — сводка за сегодня\n/stats — статистика за 7 дней\n/notify — включить уведомления\n/notify_off — отключить\n\n📝 Текст: «покормила грудью в 14:00» — запишет; «когда кормили?» — ответит\n🎙️ Голосовые — транскрибируются`,
      );
    });

    bot.onText(/\/today/, async (msg) => {
      const childId = await this.defaultChildId();
      if (!childId) return void bot.sendMessage(msg.chat.id, 'Нет данных. Добавьте ребёнка в Mini App.');
      const today = new Date().toISOString().slice(0, 10);
      const stats = await this.stats.computeStats(childId, today, today);
      const lines = [
        `📅 Сводка за ${today}:`,
        `🍼 Кормлений: ${stats.feedings.total}`,
        `😴 Сон: ${formatDuration(stats.sleep.total_duration_min)}`,
        `👶 Подгузников: ${stats.diapers.total}`,
      ];
      if (stats.last_growth.weight_kg) lines.push(`⚖️ Вес: ${stats.last_growth.weight_kg} кг`);
      await bot.sendMessage(msg.chat.id, lines.join('\n'));
    });

    bot.onText(/\/stats/, async (msg) => {
      const childId = await this.defaultChildId();
      if (!childId) return void bot.sendMessage(msg.chat.id, 'Нет данных. Добавьте ребёнка в Mini App.');
      const { from, to } = this.stats.resolvePeriod('week');
      const stats = await this.stats.computeStats(childId, from, to);
      const lines = [
        `📊 Статистика за 7 дней (${from} — ${to}):`,
        `🍼 Среднее кормлений/день: ${(stats.feedings.total / 7).toFixed(1)}`,
        `😴 Средний сон/день: ${formatDuration(Math.round(stats.sleep.total_duration_min / 7))}`,
        `🌙 Ночной сон: ${formatDuration(stats.sleep.night_min)}`,
        `☀️ Дневной сон: ${formatDuration(stats.sleep.nap_min)}`,
        `👶 Подгузников: ${stats.diapers.total}`,
      ];
      if (stats.last_growth.weight_kg) lines.push(`⚖️ Вес: ${stats.last_growth.weight_kg} кг`);
      await bot.sendMessage(msg.chat.id, lines.join('\n'));
    });

    bot.on('message', async (msg) => {
      try {
        if (msg.text?.startsWith('/')) return;
        if (!(await this.isAuthorized(msg.chat.id))) {
          if (!msg.text?.startsWith('/')) await bot.sendMessage(msg.chat.id, 'Для доступа введите: /start КОД_ДОСТУПА');
          return;
        }
        const author = msg.from?.first_name || 'telegram_user';

        if (msg.text) {
          await this.handleTextOrVoice('telegram', msg.text, author, msg.chat.id);
          return;
        }
        if (msg.voice) {
          const text = await this.transcribeVoice(bot, msg.voice.file_id);
          if (text) await this.handleTextOrVoice('telegram_voice', text, author, msg.chat.id, true);
        }
      } catch (err) {
        this.logger.error(`message handler error: ${(err as Error).message}`);
      }
    });
  }

  private async handleTextOrVoice(
    source: 'telegram' | 'telegram_voice',
    text: string,
    author: string,
    chatId: number,
    echo = false,
  ): Promise<void> {
    const intent = detectIntent(text);
    if (intent.type === 'record') {
      await this.rawEntries.createRawEntry({ source, text, author });
      await this.sendMessage(chatId, echo ? `Сохранено:\n${text}` : 'Сохранено');
    } else {
      await this.sendMessage(chatId, await this.responder.handleQuery(intent));
    }
  }

  private async transcribeVoice(bot: TelegramBot, fileId: string): Promise<string | null> {
    const apiKey = this.config.openaiApiKey;
    if (!apiKey) return null;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baby-bot-voice-'));
    try {
      const filePath = await bot.downloadFile(fileId, tmpDir);
      const buffer = fs.readFileSync(filePath);
      const form = new FormData();
      form.append('file', new Blob([buffer]), 'audio.ogg');
      form.append('model', 'whisper-1');
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      if (!res.ok) throw new Error(`Whisper HTTP ${res.status}`);
      const data = (await res.json()) as { text?: string };
      return data.text ?? null;
    } catch (err) {
      this.logger.warn(`transcription failed: ${(err as Error).message}`);
      return null;
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private async defaultChildId(): Promise<number | null> {
    const child = await this.prisma.child.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
    return child?.id ?? null;
  }
}
