import { Injectable } from '@nestjs/common';
import type { Event } from '@acme/baby-bot-domain';
import { PrismaService } from '../prisma/prisma.service';
import { enrichEvent, EVENT_INCLUDE, type EnrichableEvent } from '../events/event-mapper';

const CSV_HEADERS = [
  'Дата и время',
  'Событие',
  'Тип',
  'Значение',
  'Значение.Число',
  'Начало',
  'Окончание',
  'Комментарий',
] as const;

const SIDE_LABELS: Record<string, string> = {
  left: 'Левая',
  right: 'Правая',
  both: 'Обе',
};

const DIAPER_LABELS: Record<string, string> = {
  wet: 'Мокрый',
  dirty: 'Грязный',
  mixed: 'Смешанный',
};

/** `YYYY-MM-DD HH:mm:ss` — the format the CSV importer round-trips on. */
function fmt(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function escapeCsv(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

type Row = Record<(typeof CSV_HEADERS)[number], string>;

/** Reverse of the CSV importer's `mapDetails` — event → source CSV columns. */
function eventToRow(event: Event): Row {
  const d = (event.details ?? {}) as Record<string, unknown>;
  const row: Row = {
    'Дата и время': fmt(event.occurred_at),
    Событие: '',
    Тип: '',
    Значение: '',
    'Значение.Число': '',
    Начало: '',
    Окончание: '',
    Комментарий: event.note ?? '',
  };
  const durSec = (min: unknown) => (typeof min === 'number' ? String(min * 60) : '');

  switch (event.event_type) {
    case 'pumping':
      row.Событие = 'Сцеживание';
      row.Тип = SIDE_LABELS[d.breast_side as string] ?? '';
      if (d.amount_ml != null) row['Значение.Число'] = String(d.amount_ml);
      row.Начало = fmt(d.started_at as string);
      row.Окончание = fmt(d.ended_at as string);
      break;
    case 'feeding':
      if (d.feeding_type === 'breast') {
        row.Событие = 'Кормление грудью';
        row.Тип =
          d.breast_side === 'both'
            ? 'Левая;Правая'
            : SIDE_LABELS[d.breast_side as string] ?? '';
        row['Значение.Число'] = durSec(d.duration_min);
        row.Начало = fmt(d.started_at as string);
        row.Окончание = fmt(d.ended_at as string);
      } else {
        row.Событие = 'Бутылочка';
        row.Тип = (d.food_name as string) ?? '';
        if (d.amount_ml != null) row['Значение.Число'] = String(d.amount_ml);
      }
      break;
    case 'sleep':
      row.Событие = 'Сон';
      row.Тип = d.sleep_type === 'night' ? 'Ночной' : 'Дневной';
      row['Значение.Число'] = durSec(d.duration_min);
      row.Начало = fmt(d.started_at as string);
      row.Окончание = fmt(d.ended_at as string);
      break;
    case 'diaper':
      row.Событие = 'Подгузник';
      row.Тип = DIAPER_LABELS[d.diaper_type as string] ?? '';
      break;
    case 'weight':
      row.Событие = 'Вес';
      if (d.weight_kg != null) row.Значение = `${d.weight_kg} кг`;
      break;
    case 'growth':
      row.Событие = 'Рост';
      if (d.height_cm != null) row.Значение = `${d.height_cm} см`;
      break;
    case 'walk':
      row.Событие = 'Прогулка';
      row['Значение.Число'] = durSec(d.duration_min);
      row.Начало = fmt(d.started_at as string);
      row.Окончание = fmt(d.ended_at as string);
      break;
    case 'mood':
      row.Событие = 'Настроение';
      row.Тип = event.note ?? '';
      break;
    default:
      row.Событие = event.event_type;
      break;
  }
  return row;
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async toCsv(childId = 1): Promise<string> {
    const rows = await this.prisma.event.findMany({
      where: { childId },
      include: EVENT_INCLUDE,
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
    const lines = [CSV_HEADERS.join(',')];
    for (const raw of rows) {
      const row = eventToRow(enrichEvent(raw as unknown as EnrichableEvent));
      lines.push(CSV_HEADERS.map((h) => escapeCsv(row[h])).join(','));
    }
    return lines.join('\r\n');
  }
}
