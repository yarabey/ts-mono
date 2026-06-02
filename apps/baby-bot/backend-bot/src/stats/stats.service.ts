import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import {
  GrowthChartResponse,
  GrowthChartResponseSchema,
  PatternResponse,
  PatternResponseSchema,
  StatsResponse,
  StatsResponseSchema,
  whoPercentilesBoys,
  whoPercentilesGirls,
} from '@acme/baby-bot-domain';
import { PrismaService } from '../prisma/prisma.service';

/** Day-bounded range as Date objects. */
function range(dateFrom: string, dateTo: string): { from: Date; to: Date } {
  const from = new Date(dateFrom.includes('T') ? dateFrom : `${dateFrom}T00:00:00`);
  const to = new Date(dateTo.includes('T') ? dateTo : `${dateTo}T23:59:59`);
  return { from, to };
}

function recommendedWakeMaxMinutes(birthDate: Date): number {
  const ageWeeks = (Date.now() - birthDate.getTime()) / (7 * 24 * 60 * 60 * 1000);
  if (ageWeeks < 4) return 60;
  if (ageWeeks < 8) return 90;
  if (ageWeeks < 12) return 120;
  const ageMonths = ageWeeks / 4.345;
  if (ageMonths < 6) return 180;
  if (ageMonths < 9) return 240;
  return 360;
}

const FeedingRow = z.object({
  feeding_type: z.string(),
  duration_min: z.number().nullable(),
  amount_ml: z.number().nullable(),
});
const SleepRow = z.object({ sleep_type: z.string().nullable(), duration_min: z.number().nullable() });
const WalkRow = z.object({ duration_min: z.number().nullable() });
const PumpingRow = z.object({ breast_side: z.string().nullable(), amount_ml: z.number().nullable() });
const DiaperRow = z.object({ diaper_type: z.string() });
const MilkRow = z.object({ pumped_ml: z.coerce.number(), fed_ml: z.coerce.number() });
const SleepGapRow = z.object({ started_at: z.date(), ended_at: z.date() });

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  resolvePeriod(period: string, dateFrom?: string, dateTo?: string): { from: string; to: string } {
    const today = new Date().toISOString().slice(0, 10);
    const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    switch (period) {
      case 'week':
        return { from: daysAgo(7), to: today };
      case 'month':
        return { from: daysAgo(30), to: today };
      case 'custom':
        return { from: dateFrom ?? today, to: dateTo ?? today };
      case 'today':
      default:
        return { from: today, to: today };
    }
  }

  async computeStats(childId: number, dateFrom: string, dateTo: string): Promise<StatsResponse> {
    const { from, to } = range(dateFrom, dateTo);

    const [feedings, sleep, diapers, lastGrowth, pumping, walks, milk, wake] = await Promise.all([
      this.feedings(childId, from, to),
      this.sleep(childId, from, to),
      this.diapers(childId, from, to),
      this.lastGrowth(childId),
      this.pumping(childId, from, to),
      this.walks(childId, from, to),
      this.milkBalance(childId, from, to),
      this.wakeWindow(childId, from, to),
    ]);

    return StatsResponseSchema.parse({
      period: { from: dateFrom.slice(0, 10), to: dateTo.slice(0, 10) },
      feedings,
      sleep,
      diapers,
      last_growth: lastGrowth,
      pumping,
      walks,
      milk_balance: milk,
      wake_window: wake,
    });
  }

  private async feedings(childId: number, from: Date, to: Date) {
    const rows = FeedingRow.array().parse(
      await this.prisma.$queryRaw`
        SELECT ef.feeding_type,
          COALESCE(ef.duration_min, CASE WHEN ef.started_at IS NOT NULL AND ef.ended_at IS NOT NULL
            THEN CAST(EXTRACT(EPOCH FROM (ef.ended_at - ef.started_at)) / 60 AS INTEGER) END) AS duration_min,
          ef.amount_ml
        FROM event_feedings ef JOIN events e ON e.id = ef.event_id
        WHERE e.child_id = ${childId} AND e.occurred_at >= ${from} AND e.occurred_at <= ${to}`,
    );
    const byType: Record<string, number> = {};
    const mlByType: Record<string, number> = {};
    let totalDuration = 0;
    let totalMl = 0;
    for (const r of rows) {
      byType[r.feeding_type] = (byType[r.feeding_type] ?? 0) + 1;
      if (r.duration_min) totalDuration += r.duration_min;
      if (r.amount_ml) {
        totalMl += r.amount_ml;
        mlByType[r.feeding_type] = (mlByType[r.feeding_type] ?? 0) + r.amount_ml;
      }
    }
    const occurrences = await this.prisma.event.findMany({
      where: { childId, eventType: 'feeding', occurredAt: { gte: from, lte: to } },
      orderBy: { occurredAt: 'asc' },
      select: { occurredAt: true },
    });
    let avgInterval: number | null = null;
    if (occurrences.length >= 2) {
      let gap = 0;
      for (let i = 1; i < occurrences.length; i++) {
        gap += occurrences[i].occurredAt.getTime() - occurrences[i - 1].occurredAt.getTime();
      }
      avgInterval = Math.round(gap / (occurrences.length - 1) / 60000);
    }
    const last = await this.prisma.event.findFirst({
      where: { childId, eventType: 'feeding' },
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true },
    });
    return {
      total: rows.length,
      by_type: byType,
      avg_interval_min: avgInterval,
      total_duration_min: totalDuration,
      total_ml: totalMl,
      ml_by_type: mlByType,
      last_feeding_at: last?.occurredAt.toISOString() ?? null,
    };
  }

  private async sleep(childId: number, from: Date, to: Date) {
    const rows = SleepRow.array().parse(
      await this.prisma.$queryRaw`
        SELECT es.sleep_type,
          COALESCE(es.duration_min, CASE WHEN es.started_at IS NOT NULL AND es.ended_at IS NOT NULL
            THEN CAST(EXTRACT(EPOCH FROM (es.ended_at - es.started_at)) / 60 AS INTEGER) END) AS duration_min
        FROM event_sleep es JOIN events e ON e.id = es.event_id
        WHERE e.child_id = ${childId} AND e.occurred_at >= ${from} AND e.occurred_at <= ${to}`,
    );
    let totalDuration = 0;
    let nightMin = 0;
    let napMin = 0;
    let durationsCount = 0;
    for (const r of rows) {
      const dur = r.duration_min ?? 0;
      totalDuration += dur;
      if (dur > 0) durationsCount++;
      if (r.sleep_type === 'night') nightMin += dur;
      else napMin += dur;
    }
    return {
      total_count: rows.length,
      total_duration_min: totalDuration,
      night_min: nightMin,
      nap_min: napMin,
      avg_duration_min: durationsCount > 0 ? Math.round(totalDuration / durationsCount) : null,
    };
  }

  private async diapers(childId: number, from: Date, to: Date) {
    const rows = DiaperRow.array().parse(
      await this.prisma.$queryRaw`
        SELECT ed.diaper_type FROM event_diapers ed JOIN events e ON e.id = ed.event_id
        WHERE e.child_id = ${childId} AND e.occurred_at >= ${from} AND e.occurred_at <= ${to}`,
    );
    const byType: Record<string, number> = {};
    for (const r of rows) byType[r.diaper_type] = (byType[r.diaper_type] ?? 0) + 1;
    const last = await this.prisma.event.findFirst({
      where: { childId, eventType: 'diaper' },
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true },
    });
    return { total: rows.length, by_type: byType, last_diaper_at: last?.occurredAt.toISOString() ?? null };
  }

  private async lastGrowth(childId: number) {
    const growth = await this.prisma.eventGrowth.findFirst({
      where: { event: { childId }, OR: [{ heightCm: { not: null } }, { headCircumferenceCm: { not: null } }] },
      orderBy: { event: { occurredAt: 'desc' } },
      select: { heightCm: true, headCircumferenceCm: true, event: { select: { occurredAt: true } } },
    });
    const weight = await this.prisma.eventWeight.findFirst({
      where: { event: { childId } },
      orderBy: { event: { occurredAt: 'desc' } },
      select: { weightKg: true, event: { select: { occurredAt: true } } },
    });
    if (!growth && !weight) {
      return { weight_kg: null, height_cm: null, head_circumference_cm: null, measured_at: null };
    }
    const gAt = growth?.event.occurredAt ?? null;
    const wAt = weight?.event.occurredAt ?? null;
    const latest = !gAt ? wAt : wAt && wAt > gAt ? wAt : gAt;
    return {
      weight_kg: weight?.weightKg ?? null,
      height_cm: growth?.heightCm ?? null,
      head_circumference_cm: growth?.headCircumferenceCm ?? null,
      measured_at: latest ? latest.toISOString().slice(0, 10) : null,
    };
  }

  private async pumping(childId: number, from: Date, to: Date) {
    const rows = PumpingRow.array().parse(
      await this.prisma.$queryRaw`
        SELECT ep.breast_side, ep.amount_ml FROM event_pumping ep JOIN events e ON e.id = ep.event_id
        WHERE e.child_id = ${childId} AND e.occurred_at >= ${from} AND e.occurred_at <= ${to}`,
    );
    const bySide: Record<string, number> = {};
    let totalAmount = 0;
    let countWithAmount = 0;
    for (const r of rows) {
      if (r.breast_side) bySide[r.breast_side] = (bySide[r.breast_side] ?? 0) + 1;
      if (r.amount_ml) {
        totalAmount += r.amount_ml;
        countWithAmount++;
      }
    }
    return {
      total: rows.length,
      total_amount_ml: totalAmount,
      by_side: bySide,
      avg_amount_ml: countWithAmount > 0 ? Math.round(totalAmount / countWithAmount) : null,
    };
  }

  private async walks(childId: number, from: Date, to: Date) {
    const rows = WalkRow.array().parse(
      await this.prisma.$queryRaw`
        SELECT COALESCE(ew.duration_min, CASE WHEN ew.started_at IS NOT NULL AND ew.ended_at IS NOT NULL
            THEN CAST(EXTRACT(EPOCH FROM (ew.ended_at - ew.started_at)) / 60 AS INTEGER) END) AS duration_min
        FROM event_walks ew JOIN events e ON e.id = ew.event_id
        WHERE e.child_id = ${childId} AND e.occurred_at >= ${from} AND e.occurred_at <= ${to}`,
    );
    let totalDuration = 0;
    let count = 0;
    for (const r of rows) {
      if (r.duration_min) {
        totalDuration += r.duration_min;
        count++;
      }
    }
    return {
      total: rows.length,
      total_duration_min: totalDuration,
      avg_duration_min: count > 0 ? Math.round(totalDuration / count) : null,
    };
  }

  private async milkBalance(childId: number, from: Date, to: Date) {
    const [row] = MilkRow.array().parse(
      await this.prisma.$queryRaw`
        SELECT
          (SELECT COALESCE(SUM(ep.amount_ml), 0) FROM event_pumping ep JOIN events e ON e.id = ep.event_id
            WHERE e.child_id = ${childId} AND e.occurred_at >= ${from} AND e.occurred_at <= ${to}) AS pumped_ml,
          (SELECT COALESCE(SUM(ef.amount_ml), 0) FROM event_feedings ef JOIN events e ON e.id = ef.event_id
            WHERE e.child_id = ${childId} AND e.occurred_at >= ${from} AND e.occurred_at <= ${to}
              AND ef.feeding_type = 'bottle' AND ef.food_name = 'Грудное молоко') AS fed_ml`,
    );
    const pumped = Math.round(row?.pumped_ml ?? 0);
    const fed = Math.round(row?.fed_ml ?? 0);
    return { pumped_ml: pumped, fed_ml: fed, remaining_ml: pumped - fed };
  }

  private async wakeWindow(childId: number, from: Date, to: Date) {
    const child = await this.prisma.child.findUnique({ where: { id: childId }, select: { birthDate: true } });
    const recommended_max = child ? recommendedWakeMaxMinutes(child.birthDate) : 180;

    const activeSleep = await this.prisma.eventSleep.findFirst({
      where: { event: { childId }, endedAt: null },
      select: { startedAt: true },
    });
    const lastCompleted = await this.prisma.eventSleep.findFirst({
      where: { event: { childId }, endedAt: { not: null } },
      orderBy: { endedAt: 'desc' },
      select: { endedAt: true },
    });

    let sleeping_min: number | null = null;
    let sleeping_started_at: string | null = null;
    let current_min: number | null = null;
    const last_sleep_ended_at = lastCompleted?.endedAt?.toISOString() ?? null;

    if (activeSleep?.startedAt) {
      sleeping_started_at = activeSleep.startedAt.toISOString();
      sleeping_min = Math.round((Date.now() - activeSleep.startedAt.getTime()) / 60000);
    } else if (lastCompleted?.endedAt) {
      current_min = Math.round((Date.now() - lastCompleted.endedAt.getTime()) / 60000);
    }

    const gaps: number[] = [];
    const sleeps = SleepGapRow.array().parse(
      await this.prisma.$queryRaw`
        SELECT es.started_at, es.ended_at FROM event_sleep es JOIN events e ON e.id = es.event_id
        WHERE e.child_id = ${childId} AND e.occurred_at >= ${from} AND e.occurred_at <= ${to}
          AND es.ended_at IS NOT NULL AND es.started_at IS NOT NULL
        ORDER BY es.started_at ASC`,
    );
    for (let i = 1; i < sleeps.length; i++) {
      const gap = sleeps[i].started_at.getTime() - sleeps[i - 1].ended_at.getTime();
      if (gap > 0) gaps.push(Math.round(gap / 60000));
    }
    const avg_min = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
    const max_min = gaps.length ? Math.max(...gaps) : null;

    return { current_min, sleeping_min, sleeping_started_at, avg_min, max_min, recommended_max, last_sleep_ended_at };
  }

  async computePattern(childId: number, date: string): Promise<PatternResponse> {
    const { from, to } = range(date, date);
    const events = await this.prisma.event.findMany({
      where: { childId, occurredAt: { gte: from, lte: to } },
      orderBy: { occurredAt: 'asc' },
      include: { feeding: true, sleep: true, walk: true, pumping: true, bath: true },
    });
    const mapped = events.map((e) => {
      const base: PatternResponse['events'][number] = {
        event_type: e.eventType,
        occurred_at: e.occurredAt.toISOString(),
      };
      const d = (e as Record<string, unknown>)[e.eventType] as
        | { startedAt?: Date | null; endedAt?: Date | null; durationMin?: number | null }
        | null
        | undefined;
      if (d && ['sleep', 'feeding', 'walk', 'pumping', 'bath'].includes(e.eventType)) {
        base.started_at = d.startedAt ? d.startedAt.toISOString() : null;
        base.ended_at = d.endedAt ? d.endedAt.toISOString() : null;
        base.duration_min = d.durationMin ?? null;
      }
      return base;
    });
    return PatternResponseSchema.parse({ date, events: mapped });
  }

  async growthChart(childId: number): Promise<GrowthChartResponse> {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');

    const growthRows = await this.prisma.eventGrowth.findMany({
      where: { event: { childId } },
      orderBy: { event: { occurredAt: 'asc' } },
      select: { heightCm: true, headCircumferenceCm: true, event: { select: { occurredAt: true } } },
    });
    const weightRows = await this.prisma.eventWeight.findMany({
      where: { event: { childId } },
      orderBy: { event: { occurredAt: 'asc' } },
      select: { weightKg: true, event: { select: { occurredAt: true } } },
    });

    const byDate = new Map<string, { weight_kg: number | null; height_cm: number | null; head_circumference_cm: number | null }>();
    for (const r of growthRows) {
      const key = r.event.occurredAt.toISOString().slice(0, 10);
      const e = byDate.get(key) ?? { weight_kg: null, height_cm: null, head_circumference_cm: null };
      if (r.heightCm != null) e.height_cm = r.heightCm;
      if (r.headCircumferenceCm != null) e.head_circumference_cm = r.headCircumferenceCm;
      byDate.set(key, e);
    }
    for (const r of weightRows) {
      const key = r.event.occurredAt.toISOString().slice(0, 10);
      const e = byDate.get(key) ?? { weight_kg: null, height_cm: null, head_circumference_cm: null };
      e.weight_kg = r.weightKg;
      byDate.set(key, e);
    }

    const dataPoints = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, m]) => ({ date, ...m }));

    const gender = child.gender === 'male' ? 'male' : 'female';
    return GrowthChartResponseSchema.parse({
      child: {
        id: child.id,
        name: child.name,
        birth_date: child.birthDate.toISOString().slice(0, 10),
        gender,
      },
      data_points: dataPoints,
      percentiles: gender === 'male' ? whoPercentilesBoys : whoPercentilesGirls,
    });
  }
}
