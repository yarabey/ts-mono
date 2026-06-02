import { Injectable, NotFoundException } from '@nestjs/common';
import { RawEntry, RawEntryStatus, Source } from '@acme/baby-bot-domain';
import type { RawEntry as RawEntryRow } from '../generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { DiaryService } from '../diary/diary.service';
import { enrichEvent, EVENT_INCLUDE } from '../events/event-mapper';
import { isoOrNull } from '../common/case';

function extractEmoji(text: string): string | undefined {
  const match = text.match(/\p{Extended_Pictographic}/u);
  return match ? match[0] : undefined;
}

@Injectable()
export class RawEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly diary: DiaryService,
  ) {}

  /** Ingest a free-form message: persist as a pending raw entry and (if
   * enabled) mirror it to the markdown diary. Used by telegram/alice. */
  async createRawEntry(input: {
    source: Source;
    text: string;
    author?: string;
    recordedAt?: string;
  }) {
    const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();
    const entry = await this.prisma.rawEntry.create({
      data: {
        source: input.source,
        author: input.author ?? null,
        text: input.text,
        recordedAt,
        status: 'pending',
        emoji: extractEmoji(input.text) ?? null,
      },
    });
    this.diary.write(input.source, input.text, input.author ?? 'unknown', recordedAt);
    return entry;
  }

  async list(filter: { status?: RawEntryStatus; limit?: number; offset?: number }) {
    const limit = Math.min(filter.limit ?? 50, 200);
    const entries = await this.prisma.rawEntry.findMany({
      where: filter.status ? { status: filter.status } : undefined,
      orderBy: { recordedAt: 'desc' },
      take: limit,
      skip: filter.offset ?? 0,
    });

    const processedIds = entries.filter((e) => e.status === 'processed').map((e) => e.id);
    const linkedByEntry = new Map<number, ReturnType<typeof enrichEvent>[]>();
    if (processedIds.length) {
      const events = await this.prisma.event.findMany({
        where: { rawEntryId: { in: processedIds } },
        include: EVENT_INCLUDE,
      });
      for (const ev of events) {
        const list = linkedByEntry.get(ev.rawEntryId as number) ?? [];
        list.push(enrichEvent(ev));
        linkedByEntry.set(ev.rawEntryId as number, list);
      }
    }

    return { entries: entries.map((e) => this.toApi(e, linkedByEntry.get(e.id))) };
  }

  async retry(id: number) {
    const entry = await this.prisma.rawEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Raw entry not found');
    await this.prisma.rawEntry.update({
      where: { id },
      data: { status: 'pending', parsedEvents: 0, errorMessage: null },
    });
    return { status: 'pending' };
  }

  // --- helpers used by the AI processor -----------------------------------

  getPending(limit = 20) {
    return this.prisma.rawEntry.findMany({
      where: { status: 'pending' },
      orderBy: { recordedAt: 'asc' },
      take: limit,
    });
  }

  updateStatus(id: number, status: RawEntryStatus, extra: { parsedEvents?: number; errorMessage?: string | null } = {}) {
    return this.prisma.rawEntry.update({
      where: { id },
      data: {
        status,
        ...(extra.parsedEvents !== undefined && { parsedEvents: extra.parsedEvents }),
        ...(extra.errorMessage !== undefined && { errorMessage: extra.errorMessage }),
        ...(status === 'processed' && { processedAt: new Date() }),
      },
    });
  }

  private toApi(e: RawEntryRow, linked?: ReturnType<typeof enrichEvent>[]): RawEntry {
    return {
      id: e.id,
      source: e.source,
      author: e.author ?? null,
      text: e.text,
      file_path: e.filePath ?? null,
      recorded_at: e.recordedAt.toISOString(),
      status: e.status,
      parsed_events: e.parsedEvents ?? null,
      error_message: e.errorMessage ?? null,
      emoji: e.emoji ?? null,
      created_at: isoOrNull(e.createdAt),
      processed_at: isoOrNull(e.processedAt),
      linked_events: linked,
    };
  }
}
