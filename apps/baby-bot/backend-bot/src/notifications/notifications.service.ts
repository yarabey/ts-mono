import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

interface Thresholds {
  feeding_min: number;
  diaper_min: number;
  wake_min: number;
}
const DEFAULTS: Thresholds = { feeding_min: 180, diaper_min: 240, wake_min: 150 };

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger('NotificationsService');
  private readonly notifiedTimers = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  onModuleInit(): void {
    // Initial check shortly after boot (parity with original startup check).
    void this.runChecks();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runChecks(): Promise<void> {
    try {
      await this.checkAndNotify(1);
      await this.checkLongTimers();
    } catch (err) {
      this.logger.warn(`notification check failed: ${(err as Error).message}`);
    }
  }

  private async getChatId(): Promise<number | null> {
    const row = await this.prisma.userSetting.findUnique({
      where: { userId_key: { userId: 1, key: 'notify_chat_id' } },
    });
    return row?.value ? Number(row.value) : null;
  }

  private async getThresholds(): Promise<Thresholds> {
    const row = await this.prisma.userSetting.findUnique({
      where: { userId_key: { userId: 1, key: 'notify_thresholds' } },
    });
    if (!row?.value) return DEFAULTS;
    try {
      return { ...DEFAULTS, ...(JSON.parse(row.value) as Partial<Thresholds>) };
    } catch {
      return DEFAULTS;
    }
  }

  private async hasActiveSleep(childId: number): Promise<boolean> {
    const timer = await this.prisma.timer.findFirst({ where: { childId, eventType: 'sleep' } });
    if (timer) return true;
    const open = await this.prisma.eventSleep.findFirst({ where: { event: { childId }, endedAt: null } });
    return !!open;
  }

  async checkAndNotify(childId: number): Promise<void> {
    const chatId = await this.getChatId();
    if (!chatId) return;
    const t = await this.getThresholds();
    const now = Date.now();
    const messages: string[] = [];

    const lastFeeding = await this.prisma.event.findFirst({
      where: { childId, eventType: 'feeding' },
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true },
    });
    if (lastFeeding) {
      const gap = (now - lastFeeding.occurredAt.getTime()) / 60000;
      if (gap > t.feeding_min) messages.push(`🍼 Не кормили ${Math.floor(gap / 60)}ч ${Math.floor(gap % 60)}м`);
    }

    const lastDiaper = await this.prisma.event.findFirst({
      where: { childId, eventType: 'diaper' },
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true },
    });
    if (lastDiaper) {
      const gap = (now - lastDiaper.occurredAt.getTime()) / 60000;
      if (gap > t.diaper_min) messages.push(`🧷 Последний подгузник ${Math.floor(gap / 60)}ч ${Math.floor(gap % 60)}м назад`);
    }

    if (!(await this.hasActiveSleep(childId))) {
      const lastSleep = await this.prisma.eventSleep.findFirst({
        where: { event: { childId }, endedAt: { not: null } },
        orderBy: { event: { occurredAt: 'desc' } },
        select: { endedAt: true },
      });
      if (lastSleep?.endedAt) {
        const gap = (now - lastSleep.endedAt.getTime()) / 60000;
        if (gap > t.wake_min) messages.push(`👀 Малыш бодрствует уже ${Math.floor(gap / 60)}ч ${Math.floor(gap % 60)}м`);
      }
    }

    if (messages.length) await this.telegram.sendMessage(chatId, messages.join('\n'));
  }

  private async isTimerStale(timer: { eventType: string; childId: number; startedAt: Date }): Promise<boolean> {
    if (timer.eventType === 'sleep') {
      const row = await this.prisma.eventSleep.findFirst({
        where: { event: { childId: timer.childId }, endedAt: { not: null }, startedAt: { gte: timer.startedAt } },
      });
      return !!row;
    }
    if (timer.eventType === 'feeding') {
      const row = await this.prisma.eventFeeding.findFirst({
        where: { event: { childId: timer.childId }, endedAt: { not: null }, startedAt: { gte: timer.startedAt } },
      });
      return !!row;
    }
    return false;
  }

  async checkLongTimers(): Promise<void> {
    const chatId = await this.getChatId();
    if (!chatId) return;
    const timers = await this.prisma.timer.findMany();
    const now = Date.now();
    for (const timer of timers) {
      const elapsedMin = (now - timer.startedAt.getTime()) / 60000;
      const isFeedingLong = timer.eventType === 'feeding' && elapsedMin > 60;
      const isSleepLong = timer.eventType === 'sleep' && elapsedMin > 240;
      if (!isFeedingLong && !isSleepLong) continue;
      if (await this.isTimerStale(timer)) {
        await this.prisma.timer.delete({ where: { id: timer.id } }).catch(() => undefined);
        this.notifiedTimers.delete(timer.id);
        continue;
      }
      if (this.notifiedTimers.has(timer.id)) continue;
      const msg = isFeedingLong
        ? `⚠️ Кормление длится уже ${Math.floor(elapsedMin)} мин. Не забыли остановить таймер?`
        : `⚠️ Сон длится уже ${Math.floor(elapsedMin / 60)}ч ${Math.floor(elapsedMin % 60)}м. Не забыли остановить таймер?`;
      await this.telegram.sendMessage(chatId, msg);
      this.notifiedTimers.add(timer.id);
    }
  }
}
