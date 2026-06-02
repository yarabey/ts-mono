import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { z } from 'zod';
import { ParseOperation, ParseOperationSchema } from '@acme/baby-bot-domain';
import type { Prisma } from '../generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { RawEntriesService } from '../raw-entries/raw-entries.service';
import { TelegramService } from '../telegram/telegram.service';
import { keysToSnake } from '../common/case';
import { detailDelegate } from '../common/prisma-delegate';
import {
  buildDetailData,
  EVENT_INCLUDE,
  TABLE_TO_DELEGATE,
  TABLES_WITH_STARTED_AT,
} from '../events/event-mapper';

const API_TIMEOUT_MS = 240_000;
const TRANSIENT = /timeout|ECONNREFUSED|ECONNRESET|ETIMEDOUT|503|429|rate|Unexpected end of JSON|truncated|aborted/i;
const EVENT_KEYWORDS = /корм|груд|бутыл|сон|спал|уснул|проснул|подгуз|памперс|куп|прогул|вес|рост|темпер|вакцин|сцеж|врач|медикам/i;

export interface ProcessorResult {
  checked: number;
  processed: number;
  errors: number;
}

@Injectable()
export class AiProcessorService {
  private readonly logger = new Logger('AiProcessorService');
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly rawEntries: RawEntriesService,
    private readonly telegram: TelegramService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduled(): Promise<void> {
    if (!this.config.aiEnabled || this.running) return;
    this.running = true;
    try {
      await this.process();
    } catch (err) {
      this.logger.error(`AI processor failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  async process(callApi = this.callZai.bind(this)): Promise<ProcessorResult> {
    const pending = await this.rawEntries.getPending();
    if (pending.length === 0) return { checked: 0, processed: 0, errors: 0 };

    try {
      const systemPrompt = await this.buildSystemPrompt();
      const content = await callApi(systemPrompt, 'Обработай pending raw_entries и верни JSON с операциями.');
      const operations = this.parseResponse(content);
      const processedRawIds = await this.executeOperations(operations);

      let processed = 0;
      let errors = 0;
      const needsReview: typeof pending = [];
      for (const entry of pending) {
        if (processedRawIds.has(entry.id)) {
          processed++;
        } else if (EVENT_KEYWORDS.test(entry.text.toLowerCase())) {
          await this.rawEntries.updateStatus(entry.id, 'needs_review', { parsedEvents: 0, errorMessage: 'AI не распознал событие' });
          needsReview.push(entry);
          errors++;
        } else {
          await this.rawEntries.updateStatus(entry.id, 'processed', { parsedEvents: 0 });
          processed++;
        }
      }

      if (needsReview.length) await this.notifyNeedsReview(needsReview.map((e) => e.text));
      return { checked: pending.length, processed, errors };
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      const isTransient = TRANSIENT.test(msg);
      this.logger.error(`Error processing entries (transient=${isTransient}): ${msg}`);
      for (const entry of pending) {
        if (isTransient) {
          await this.rawEntries.updateStatus(entry.id, 'pending', { parsedEvents: 0 });
        } else {
          await this.rawEntries.updateStatus(entry.id, 'error', { parsedEvents: 0, errorMessage: msg.slice(0, 2000) });
        }
      }
      return { checked: pending.length, processed: 0, errors: isTransient ? 0 : pending.length };
    }
  }

  // --- context + prompt ----------------------------------------------------

  private async buildSystemPrompt(): Promise<string> {
    const child = await this.prisma.child.findFirst({ orderBy: { id: 'asc' } });
    const childName = child?.name ?? 'ребёнок';
    const childBirth = child ? child.birthDate.toISOString().slice(0, 10) : '?';
    const childId = child?.id ?? 1;

    const recent = await this.prisma.event.findMany({
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: 10,
      include: EVENT_INCLUDE,
    });
    const open = await this.prisma.event.findMany({
      where: {
        eventType: { in: ['sleep', 'feeding', 'walk'] },
        OR: [{ sleep: { endedAt: null } }, { feeding: { endedAt: null } }, { walk: { endedAt: null } }],
      },
      orderBy: { occurredAt: 'desc' },
      include: EVENT_INCLUDE,
    });
    const pending = await this.rawEntries.getPending();

    const detailOf = (e: Record<string, unknown>) => {
      const rel = ['feeding', 'sleep', 'diaper', 'growth', 'weight', 'walk', 'health', 'milestone', 'pumping', 'bath'].find(
        (r) => e[r],
      );
      if (!rel) return null;
      const { id: _i, eventId: _e, ...rest } = e[rel] as Record<string, unknown>;
      void _i;
      void _e;
      return keysToSnake(rest, { dropEmpty: false });
    };

    let eventsTable = '| id | type | occurred_at | source | author | note |\n|---|---|---|---|---|---|\n';
    if (!recent.length) eventsTable = 'Нет событий\n';
    else
      for (const e of recent)
        eventsTable += `| ${e.id} | ${e.eventType} | ${e.occurredAt.toISOString()} | ${e.source} | ${(e.author ?? '').substring(0, 20)} | ${(e.note ?? '').substring(0, 60)} |\n`;

    let detailsSection = '';
    for (const e of recent.slice(0, 5)) {
      const d = detailOf(e);
      if (d && Object.keys(d).length) detailsSection += `**${e.eventType} #${e.id}**: ${JSON.stringify(d)}\n`;
    }
    if (!detailsSection) detailsSection = 'Нет деталей\n';

    let openSection = 'Нет открытых событий\n';
    if (open.length) {
      openSection = '';
      for (const e of open)
        openSection += `- **${e.eventType} #${e.id}** (started ${e.occurredAt.toISOString()}): ${JSON.stringify(detailOf(e) ?? {})} — **ОТКРЫТ**\n`;
    }

    let pendingSection = 'Нет pending-записей\n';
    if (pending.length) {
      pendingSection = '| id | source | author | text | recorded_at |\n|---|---|---|---|---|\n';
      for (const e of pending)
        pendingSection += `| ${e.id} | ${e.source} | ${(e.author ?? '').substring(0, 20)} | ${e.text} | ${e.recordedAt.toISOString()} |\n`;
    }

    return `Ты парсишь записи из дневника ребёнка (${childName}, дата рождения: ${childBirth}).

## Последние события

${eventsTable}

## Детали событий

${detailsSection}

## Открытые события (ended_at IS NULL — ребёнок ещё делает это)

${openSection}

## Pending raw_entries (обработать по порядку recorded_at)

${pendingSection}

## Твоя задача

Проанализируй pending raw_entries и верни JSON с операциями для БД.
Обрабатывай записи строго в хронологическом порядке (по recorded_at).

### Правила
1. Одна запись может содержать несколько событий (например «покормили и уснула»).
2. Сначала проверь, не является ли текст продолжением открытого события.
3. Время: если указано точное — используй его, если нет — используй recorded_at. Формат ISO 8601 с T-разделителем (2025-01-15T14:30:00).
4. Если не удалось классифицировать — сохраняй как note (event_type: "note", details не нужны).
5. Если текст не содержит событий или бессмысленный — НЕ создавай операций.
6. Если текст содержит число+единицы (мл, мин, кг, см) — это скорее всего событие. Создавай операцию.
7. Если текст описывает действие с ребёнком — ВСЕГДА создавай событие, даже если не уверен в типе.
8. Если не уверен — создавай как note, не пропускай.

### Паттерны продолжения (UPDATE вместо INSERT)
- «проснулась», «встала», «не уснула» → найти открытое sleep, проставить ended_at и duration_min
- «закончили кормить», «доели», «отняла от груди» → найти открытое feeding, проставить ended_at
- «уснула», «заснула» → обновить started_at у открытого sleep ИЛИ INSERT нового
- «вернулись с прогулки» → найти открытый walk, проставить ended_at
- «ещё 50 мл», «докормили» → найти последний feeding, обновить amount_ml

### Формат ответа

Верни ТОЛЬКО чистый JSON. Без markdown, без комментариев, без \`\`\`json\`\`\`.

Для создания нового:
{"action":"create_event","event":{"child_id":${childId},"event_type":"...","occurred_at":"...","source":"ai_parsed","author":"...","note":"..."},"details":{"table":"...","data":{...}},"raw_entry_id":...}

Для обновления существующего:
{"action":"update_details","event_id":...,"table":"...","data":{...},"event_update":{"note":"..."},"raw_entry_id":...}

### Имена полей по таблицам (используй ТОЛЬКО эти имена):
- event_sleep: sleep_type (night|nap), started_at, ended_at, duration_min, quality (good|normal|bad)
- event_feedings: feeding_type (breast|bottle|solid|mixed), breast_side (left|right|both), duration_min, amount_ml, food_name, started_at, ended_at
- event_diapers: diaper_type (wet|dirty|mixed), color
- event_growth: height_cm, head_circumference_cm
- event_weight: weight_kg
- event_health: health_type (temperature|vaccination|doctor|medication|illness), value, doctor_name, vaccine_name, medication, description
- event_milestones: category (motor|speech|social|cognitive), title, description
- event_pumping: breast_side, amount_ml, duration_min, started_at, ended_at
- event_walks: duration_min, started_at, ended_at
- event_baths: duration_min, started_at, ended_at

Пример: {"operations":[...]}`;
  }

  private async callZai(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.config.zaiApiKey) throw new Error('ZAI_API_KEY is not set');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.config.zaiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.zaiApiKey}` },
        body: JSON.stringify({
          model: this.config.zaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.1,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`ZAI HTTP ${res.status}`);
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      return data.choices[0].message.content;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResponse(content: string): ParseOperation[] {
    let jsonStr = content.trim();
    const md = jsonStr.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
    if (md) jsonStr = md[1].trim();
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start !== -1 && end > start) jsonStr = jsonStr.substring(start, end + 1);
    const parsed = JSON.parse(jsonStr) as { operations?: unknown };
    if (!parsed.operations || !Array.isArray(parsed.operations)) {
      throw new Error('Response does not contain operations array');
    }
    return z.array(ParseOperationSchema).parse(parsed.operations);
  }

  private async executeOperations(operations: ParseOperation[]): Promise<Set<number>> {
    return this.prisma.$transaction(async (tx) => {
      const counts = new Map<number, number>();
      for (const op of operations) {
        if (op.action === 'create_event') {
          const occurredAt = new Date(op.event.occurred_at);
          const event = await tx.event.create({
            data: {
              childId: op.event.child_id,
              eventType: op.event.event_type as never,
              occurredAt,
              source: 'ai_parsed',
              author: op.event.author ?? null,
              note: op.event.note ?? null,
              rawEntryId: op.raw_entry_id ?? null,
            },
          });
          if (op.details?.table && op.details.data) {
            const delegate = TABLE_TO_DELEGATE[op.details.table];
            if (!delegate) throw new Error(`Invalid detail table: ${op.details.table}`);
            const data = buildDetailData(op.details.data);
            if (TABLES_WITH_STARTED_AT.has(op.details.table) && !data.startedAt) data.startedAt = occurredAt;
            await detailDelegate(tx, delegate).create({ data: { eventId: event.id, ...data } });
          }
          if (op.raw_entry_id) await this.linkRawEntry(tx, event.id, op.raw_entry_id, 'created');
          if (op.raw_entry_id) counts.set(op.raw_entry_id, (counts.get(op.raw_entry_id) ?? 0) + 1);
        } else {
          const delegate = TABLE_TO_DELEGATE[op.table];
          if (!delegate) throw new Error(`Invalid detail table: ${op.table}`);
          if (Object.keys(op.data).length) {
            await detailDelegate(tx, delegate).update({
              where: { eventId: op.event_id },
              data: buildDetailData(op.data),
            });
          }
          const note = (op.event_update as { note?: string } | undefined)?.note;
          if (note !== undefined) await tx.event.update({ where: { id: op.event_id }, data: { note } });
          if (op.raw_entry_id) await this.linkRawEntry(tx, op.event_id, op.raw_entry_id, 'updated');
          if (op.raw_entry_id) counts.set(op.raw_entry_id, (counts.get(op.raw_entry_id) ?? 0) + 1);
        }
      }
      for (const [rawId, count] of counts) {
        await tx.rawEntry.update({ where: { id: rawId }, data: { status: 'processed', parsedEvents: count, processedAt: new Date() } });
      }
      return new Set(counts.keys());
    });
  }

  private async linkRawEntry(
    tx: Prisma.TransactionClient,
    eventId: number,
    rawEntryId: number,
    role: 'created' | 'updated',
  ): Promise<void> {
    await tx.eventRawEntry.upsert({
      where: { eventId_rawEntryId: { eventId, rawEntryId } },
      update: {},
      create: { eventId, rawEntryId, role },
    });
  }

  private async notifyNeedsReview(texts: string[]): Promise<void> {
    const chat = await this.prisma.userSetting.findUnique({
      where: { userId_key: { userId: 1, key: 'notify_chat_id' } },
    });
    if (!chat?.value) return;
    const body = texts.map((t) => `• "${t}"`).join('\n');
    await this.telegram.sendMessage(Number(chat.value), `⚠️ Не удалось распознать:\n${body}\n\nУточните или добавьте вручную через Mini App.`);
  }
}
