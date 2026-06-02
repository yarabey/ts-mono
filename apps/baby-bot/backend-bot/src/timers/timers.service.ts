import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { StartTimerPayload } from '@acme/baby-bot-domain';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class TimersService {
  private readonly logger = new Logger('TimersService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  private async suggestBreastSide(childId: number): Promise<'left' | 'right'> {
    const last = await this.prisma.eventFeeding.findFirst({
      where: { breastSide: { in: ['left', 'right'] }, event: { childId } },
      orderBy: { event: { occurredAt: 'desc' } },
      select: { breastSide: true },
    });
    return last?.breastSide === 'left' ? 'right' : 'left';
  }

  private suggestSleepType(): 'night' | 'nap' {
    const hour = new Date().getHours();
    return hour >= 21 || hour < 6 ? 'night' : 'nap';
  }

  async start(body: StartTimerPayload) {
    const childId = body.child_id ?? 1;
    const id = crypto.randomUUID();
    const now = new Date();
    await this.prisma.timer.create({
      data: {
        id,
        eventType: body.event_type,
        details: JSON.stringify(body.details ?? {}),
        startedAt: now,
        childId,
      },
    });

    const suggested_defaults: Record<string, unknown> = {};
    if (body.event_type === 'feeding') {
      suggested_defaults.breast_side = await this.suggestBreastSide(childId);
      suggested_defaults.feeding_type = 'breast';
    } else if (body.event_type === 'sleep') {
      suggested_defaults.sleep_type = this.suggestSleepType();
    }

    this.logger.log(`Timer started: ${id} (${body.event_type})`);
    return { timer_id: id, event_type: body.event_type, started_at: now.toISOString(), suggested_defaults };
  }

  async stop(timerId: string, author?: string) {
    const timer = await this.prisma.timer.findUnique({ where: { id: timerId } });
    if (!timer) throw new NotFoundException('Timer not found');

    const endedAt = new Date();
    const startedAtIso = timer.startedAt.toISOString();
    const durationMin = Math.round((endedAt.getTime() - timer.startedAt.getTime()) / 60000);
    const details = (timer.details ? JSON.parse(timer.details) : {}) as Record<string, unknown>;

    let detailPayload: Record<string, unknown> | undefined;
    if (timer.eventType === 'feeding') {
      detailPayload = {
        feeding_type: details.feeding_type ?? 'breast',
        breast_side: details.breast_side,
        duration_min: durationMin,
        started_at: startedAtIso,
        ended_at: endedAt.toISOString(),
        amount_ml: details.amount_ml,
        food_name: details.food_name,
      };
    } else if (timer.eventType === 'sleep') {
      detailPayload = {
        sleep_type: details.sleep_type,
        started_at: startedAtIso,
        ended_at: endedAt.toISOString(),
        duration_min: durationMin,
      };
    }

    const event = await this.events.createEventWithDetails({
      childId: timer.childId,
      eventType: timer.eventType as never,
      occurredAt: startedAtIso,
      source: 'miniapp',
      author,
      details: detailPayload,
    });

    await this.prisma.timer.delete({ where: { id: timerId } });
    this.logger.log(`Timer stopped: ${timerId} -> event ${event.id} (${durationMin}min)`);
    return { event, duration_min: durationMin };
  }

  async active() {
    const now = Date.now();
    const timers = await this.prisma.timer.findMany({ orderBy: { startedAt: 'asc' } });
    return {
      timers: timers.map((t) => ({
        timer_id: t.id,
        event_type: t.eventType,
        started_at: t.startedAt.toISOString(),
        elapsed_sec: Math.round((now - t.startedAt.getTime()) / 1000),
      })),
    };
  }
}
