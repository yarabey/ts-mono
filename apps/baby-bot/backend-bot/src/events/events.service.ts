import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateEventPayload,
  EventFilter,
  EventType,
  Source,
  UpdateEventPayload,
} from '@acme/baby-bot-domain';
import { PrismaService } from '../prisma/prisma.service';
import { detailDelegate } from '../common/prisma-delegate';
import {
  buildDetailData,
  DETAIL_DELEGATE,
  EnrichableEvent,
  enrichEvent,
  EVENT_INCLUDE,
} from './event-mapper';

const ACTIVE_TYPES: EventType[] = ['sleep', 'feeding', 'walk', 'pumping', 'bath'];

/** Normalize a 'YYYY-MM-DD' or full-ISO date into a Date at day start/end. */
function toRangeDate(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value) return undefined;
  const iso = value.includes('T') ? value : `${value}T${endOfDay ? '23:59:59' : '00:00:00'}`;
  return new Date(iso);
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: EventFilter) {
    const limit = Math.min(filter.limit ?? 50, 200);
    const offset = filter.offset ?? 0;
    const where = this.buildWhere(filter);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        include: EVENT_INCLUDE,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { events: rows.map(enrichEvent), total, limit, offset };
  }

  private buildWhere(filter: EventFilter) {
    const where: Record<string, unknown> = {
      childId: filter.child_id ?? 1,
    };
    if (filter.event_type) where.eventType = filter.event_type;
    if (filter.source) where.source = filter.source;
    const gte = toRangeDate(filter.date_from, false);
    const lte = toRangeDate(filter.date_to, true);
    if (gte || lte) where.occurredAt = { ...(gte && { gte }), ...(lte && { lte }) };
    if (filter.search) {
      where.OR = [{ note: { contains: filter.search, mode: 'insensitive' } }];
    }
    return where;
  }

  async getById(id: number) {
    const event = await this.prisma.event.findUnique({ where: { id }, include: EVENT_INCLUDE });
    if (!event) throw new NotFoundException('Event not found');
    return enrichEvent(event);
  }

  async create(body: CreateEventPayload, author?: string) {
    if (!body.event_type) throw new BadRequestException('event_type is required');
    const created = await this.createEventWithDetails({
      childId: body.child_id ?? 1,
      eventType: body.event_type,
      occurredAt: body.occurred_at ?? new Date().toISOString(),
      source: (body.source as Source) ?? 'miniapp',
      author: body.author ?? author,
      note: body.note,
      details: body.details,
      photoId: body.photo_id,
    });
    return created;
  }

  /** Shared create path used by the API, AI processor and importers. */
  async createEventWithDetails(input: {
    childId: number;
    eventType: EventType;
    occurredAt: string;
    source: Source;
    author?: string;
    note?: string;
    details?: Record<string, unknown>;
    photoId?: number;
    rawEntryId?: number;
  }) {
    const delegate = DETAIL_DELEGATE[input.eventType];
    const event = await this.prisma.$transaction(async (tx) => {
      const ev = await tx.event.create({
        data: {
          childId: input.childId,
          eventType: input.eventType,
          occurredAt: new Date(input.occurredAt),
          source: input.source,
          author: input.author ?? null,
          note: input.note ?? null,
          rawEntryId: input.rawEntryId ?? null,
        },
      });
      if (input.details && delegate) {
        await detailDelegate(tx, delegate).create({
          data: { eventId: ev.id, ...buildDetailData(input.details) },
        });
      }
      if (input.photoId) {
        await tx.photo.update({ where: { id: input.photoId }, data: { eventId: ev.id } });
      }
      return tx.event.findUnique({ where: { id: ev.id }, include: EVENT_INCLUDE });
    });
    return enrichEvent(event as unknown as EnrichableEvent);
  }

  async quickFeeding(body: Record<string, unknown>, author?: string) {
    const now = new Date().toISOString();
    return this.createEventWithDetails({
      childId: (body.child_id as number) ?? 1,
      eventType: 'feeding',
      occurredAt: (body.started_at as string) ?? (body.occurred_at as string) ?? now,
      source: 'miniapp',
      author,
      details: {
        feeding_type: body.feeding_type ?? 'breast',
        breast_side: body.breast_side,
        amount_ml: body.amount_ml,
        started_at: body.started_at ?? now,
        ended_at: body.ended_at,
      },
    });
  }

  async quickDiaper(body: Record<string, unknown>, author?: string) {
    return this.createEventWithDetails({
      childId: (body.child_id as number) ?? 1,
      eventType: 'diaper',
      occurredAt: (body.occurred_at as string) ?? new Date().toISOString(),
      source: 'miniapp',
      author,
      details: { diaper_type: body.diaper_type ?? 'wet', color: body.color },
    });
  }

  async update(id: number, body: UpdateEventPayload) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');
    const delegate = DETAIL_DELEGATE[existing.eventType as EventType];

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          eventType: body.event_type ?? existing.eventType,
          occurredAt: body.occurred_at ? new Date(body.occurred_at) : existing.occurredAt,
          note: body.note !== undefined ? body.note : existing.note,
        },
      });
      if (body.details && delegate) {
        await detailDelegate(tx, delegate).deleteMany({ where: { eventId: id } });
        await detailDelegate(tx, delegate).create({
          data: { eventId: id, ...buildDetailData(body.details) },
        });
      }
      return tx.event.findUnique({ where: { id }, include: EVENT_INCLUDE });
    });
    return enrichEvent(updated as unknown as EnrichableEvent);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');
    // Detail rows + photo/raw-entry links cascade via the schema.
    await this.prisma.event.delete({ where: { id } });
  }

  async clearAll(): Promise<void> {
    await this.prisma.event.deleteMany({});
  }

  async getActive() {
    const events = await this.prisma.event.findMany({
      where: {
        eventType: { in: ACTIVE_TYPES },
        OR: [
          { feeding: { startedAt: { not: null }, endedAt: null } },
          { sleep: { endedAt: null } },
          { walk: { startedAt: { not: null }, endedAt: null } },
          { pumping: { startedAt: { not: null }, endedAt: null } },
          { bath: { startedAt: { not: null }, endedAt: null } },
        ],
      },
      include: EVENT_INCLUDE,
      orderBy: { occurredAt: 'desc' },
    });
    return { events: events.map(enrichEvent) };
  }

  async close(id: number) {
    const event = await this.prisma.event.findUnique({ where: { id }, include: EVENT_INCLUDE });
    if (!event) throw new NotFoundException('Event not found');
    const delegate = DETAIL_DELEGATE[event.eventType as EventType];
    const relation = event.eventType as keyof typeof event;
    const detail = (delegate ? event[relation] : null) as
      | { startedAt?: Date | null; endedAt?: Date | null }
      | null;
    if (!delegate || !detail || !detail.startedAt) {
      throw new BadRequestException('Event has no start time');
    }
    if (detail.endedAt) throw new BadRequestException('Event already closed');

    const now = new Date();
    const durationMin = Math.round((now.getTime() - detail.startedAt.getTime()) / 60000);
    await detailDelegate(this.prisma, delegate).update({
      where: { eventId: id },
      data: { endedAt: now, durationMin },
    });
    return this.getById(id);
  }
}
