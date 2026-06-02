import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import type { Intent } from './intent-detector';

function formatDuration(totalMin: number): string {
  if (!totalMin) return '0 мин';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

function formatTimeAgo(iso: Date): string {
  const diffMin = Math.floor((Date.now() - iso.getTime()) / 60000);
  if (diffMin < 60) return `${diffMin} мин назад`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h < 24) return `${h}ч ${m}м назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

function formatTime(iso: Date): string {
  return iso.toISOString().slice(11, 16);
}

@Injectable()
export class QueryResponderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
  ) {}

  private async defaultChildId(): Promise<number | null> {
    const child = await this.prisma.child.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
    return child?.id ?? null;
  }

  async handleQuery(intent: Intent): Promise<string> {
    const childId = await this.defaultChildId();
    if (!childId) return 'Нет данных. Добавьте ребёнка в Mini App.';
    switch (intent.type) {
      case 'query_last':
        return this.lastEvent(childId, intent.event_type);
      case 'query_today_stats':
        return this.todayStats(childId);
      case 'query_sleep':
        return this.sleepStats(childId);
      case 'query_weight':
        return this.weight(childId);
      case 'query_diaper':
        return this.lastDiaper(childId);
      default:
        return 'Не понял вопрос. Просто напишите текст, и я запишу.';
    }
  }

  private async lastEvent(childId: number, eventType: string): Promise<string> {
    const event = await this.prisma.event.findFirst({
      where: { childId, eventType: eventType as never },
      orderBy: { occurredAt: 'desc' },
      include: { feeding: true, sleep: true },
    });
    if (!event) {
      const labels: Record<string, string> = { feeding: 'кормлений', sleep: 'снов', diaper: 'подгузников' };
      return `🍼 Пока не было ${labels[eventType] ?? eventType}.`;
    }
    const timeAgo = formatTimeAgo(event.occurredAt);
    const time = formatTime(event.occurredAt);

    if (eventType === 'feeding' && event.feeding) {
      const f = event.feeding;
      const parts: string[] = [];
      const typeLabels: Record<string, string> = { breast: 'грудь', bottle: 'бутылочка', solid: 'прикорм', mixed: 'смешанное' };
      parts.push(typeLabels[f.feedingType] ?? f.feedingType ?? 'кормление');
      const sideLabels: Record<string, string> = { left: 'левая', right: 'правая', both: 'обе' };
      if (f.breastSide && sideLabels[f.breastSide]) parts.push(sideLabels[f.breastSide]);
      if (f.durationMin) parts.push(`${f.durationMin} мин`);
      if (f.amountMl) parts.push(`${f.amountMl} мл`);
      return `🍼 Последнее кормление: ${parts.join(', ')}\n🕐 ${timeAgo} (${time})`;
    }
    if (eventType === 'sleep' && event.sleep) {
      const label = event.sleep.sleepType === 'night' ? 'Ночной' : 'Дневной';
      const dur = event.sleep.durationMin ? formatDuration(event.sleep.durationMin) : '';
      return `😴 ${label} сон${dur ? `: ${dur}` : ''}\n🕐 ${timeAgo} (${time})`;
    }
    return `${eventType}: ${timeAgo} (${time})`;
  }

  private async todayStats(childId: number): Promise<string> {
    const today = new Date().toISOString().slice(0, 10);
    const stats = await this.stats.computeStats(childId, today, today);
    const lines = [
      '📅 Сводка за сегодня:',
      `🍼 Кормлений: ${stats.feedings.total}`,
      `😴 Сон: ${formatDuration(stats.sleep.total_duration_min)}`,
      `👶 Подгузников: ${stats.diapers.total}`,
    ];
    if (stats.last_growth.weight_kg) lines.push(`⚖️ Вес: ${stats.last_growth.weight_kg} кг`);
    return lines.join('\n');
  }

  private async sleepStats(childId: number): Promise<string> {
    const today = new Date().toISOString().slice(0, 10);
    const stats = await this.stats.computeStats(childId, today, today);
    const lines = [`😴 Сегодня: ${stats.sleep.total_count} сна, ${formatDuration(stats.sleep.total_duration_min)} всего`];
    const last = await this.prisma.event.findFirst({
      where: { childId, eventType: 'sleep' },
      orderBy: { occurredAt: 'desc' },
      include: { sleep: true },
    });
    if (last?.sleep) {
      const label = last.sleep.sleepType === 'night' ? 'Ночной' : 'Дневной';
      const dur = last.sleep.durationMin ? formatDuration(last.sleep.durationMin) : 'идёт';
      const end = last.sleep.endedAt ? `–${formatTime(last.sleep.endedAt)}` : '';
      lines.push(`Последний (${label}): ${formatTime(last.occurredAt)}${end} (${dur})`);
    }
    lines.push(`Ночной: ${formatDuration(stats.sleep.night_min)} | Дневной: ${formatDuration(stats.sleep.nap_min)}`);
    return lines.join('\n');
  }

  private async weight(childId: number): Promise<string> {
    const rows = await this.prisma.eventWeight.findMany({
      where: { event: { childId } },
      orderBy: { event: { occurredAt: 'desc' } },
      take: 2,
      select: { weightKg: true, event: { select: { occurredAt: true } } },
    });
    if (!rows.length) return '⚖️ Вес пока не измеряли.';
    const current = rows[0].weightKg;
    const prev = rows.length >= 2 ? rows[1].weightKg : current;
    const diff = Math.round((current - prev) * 1000) / 1000;
    const daysAgo = Math.floor((Date.now() - rows[0].event.occurredAt.getTime()) / 86400000);
    const daysStr = daysAgo === 0 ? 'сегодня' : `${daysAgo} дн назад`;
    return `⚖️ Вес: ${current} кг (${daysStr})\nИзменение: ${diff >= 0 ? '+' : ''}${diff} кг`;
  }

  private async lastDiaper(childId: number): Promise<string> {
    const event = await this.prisma.event.findFirst({
      where: { childId, eventType: 'diaper' },
      orderBy: { occurredAt: 'desc' },
      include: { diaper: true },
    });
    if (!event?.diaper) return '👶 Подгузников пока не было.';
    const labels: Record<string, string> = { wet: 'мокрый', dirty: 'грязный', mixed: 'смешанный' };
    return `👶 Последний подгузник: ${labels[event.diaper.diaperType] ?? event.diaper.diaperType}\n🕐 ${formatTimeAgo(event.occurredAt)} (${formatTime(event.occurredAt)})`;
  }
}
