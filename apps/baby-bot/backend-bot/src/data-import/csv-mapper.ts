import * as crypto from 'crypto';

export interface CsvRow {
  datetime: string;
  event: string;
  type: string;
  value: string;
  valueNum: string;
  start: string;
  end: string;
  comment: string;
}

export interface MappedRow {
  eventType: string;
  details: Record<string, unknown> | null;
  note?: string;
}

export const EVENT_MAP: Record<string, string> = {
  Сцеживание: 'pumping',
  Бутылочка: 'feeding',
  Сон: 'sleep',
  Подгузник: 'diaper',
  'Кормление грудью': 'feeding',
  Вес: 'weight',
  Рост: 'growth',
  Прогулка: 'walk',
  Настроение: 'mood',
};

const SIDE_MAP: Record<string, 'left' | 'right' | 'both'> = {
  Левая: 'left',
  Правая: 'right',
  Обе: 'both',
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else inQuotes = false;
      } else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      result.push(current);
      current = '';
    } else current += ch;
  }
  result.push(current);
  return result;
}

export function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]);
  const colIdx: Record<string, number> = {};
  header.forEach((h, i) => (colIdx[h.trim()] = i));
  const at = (fields: string[], name: string) => (fields[colIdx[name]] ?? '').trim();

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < 3) continue;
    rows.push({
      datetime: at(fields, 'Дата и время'),
      event: at(fields, 'Событие'),
      type: at(fields, 'Тип'),
      value: at(fields, 'Значение'),
      valueNum: at(fields, 'Значение.Число'),
      start: at(fields, 'Начало'),
      end: at(fields, 'Окончание'),
      comment: at(fields, 'Комментарий'),
    });
  }
  return rows;
}

export function uniqueKey(row: CsvRow): string {
  return `${row.datetime}|${row.event}|${row.type}`;
}

export function rowHash(row: CsvRow): string {
  return crypto.createHash('md5').update(JSON.stringify(row)).digest('hex');
}

function num(val: string): number | null {
  if (!val) return null;
  const n = parseFloat(val.replace(',', '.').trim());
  return isNaN(n) ? null : n;
}

export function toIso(dateTime: string): string {
  return dateTime.replace(' ', 'T');
}

/** End = start + duration, so a timed event's end never collapses onto its
 * start when the source CSV omits the `Окончание` column. */
function addMinIso(startIso: string | undefined, min: number | null): string | undefined {
  if (!startIso || min == null) return undefined;
  const t = new Date(startIso).getTime();
  if (Number.isNaN(t)) return undefined;
  return new Date(t + min * 60000).toISOString();
}

/** Duration derived from an explicit start/end pair (positive minutes only). */
function diffMin(startIso: string | undefined, endIso: string | undefined): number | null {
  if (!startIso || !endIso) return null;
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  const m = Math.round((b - a) / 60000);
  return m > 0 ? m : null;
}

/** Map a source CSV row to an event type + detail payload (snake_case). */
export function mapDetails(row: CsvRow): MappedRow {
  const valNum = num(row.valueNum);
  switch (row.event) {
    case 'Сцеживание': {
      const started = row.start ? toIso(row.start) : undefined;
      const ended = row.end ? toIso(row.end) : undefined;
      return {
        eventType: 'pumping',
        details: {
          breast_side: SIDE_MAP[row.type] ?? null,
          amount_ml: valNum,
          started_at: started,
          ended_at: ended,
          duration_min: diffMin(started, ended),
        },
      };
    }
    case 'Бутылочка':
      return { eventType: 'feeding', details: { feeding_type: 'bottle', amount_ml: valNum ?? 0, food_name: row.type || null } };
    case 'Кормление грудью': {
      const sides = row.type.split(';').map((s) => s.trim()).filter(Boolean);
      const breastSide = sides.length > 1 ? 'both' : SIDE_MAP[sides[0]] ?? null;
      const started = row.start ? toIso(row.start) : toIso(row.datetime);
      const explicitDuration = valNum != null ? Math.round(valNum / 60) : null;
      const ended = row.end ? toIso(row.end) : addMinIso(started, explicitDuration);
      const durationMin = explicitDuration ?? diffMin(started, ended);
      let left: number | null = null;
      let right: number | null = null;
      if (sides.length > 1 && durationMin != null) {
        left = Math.round(durationMin / 2);
        right = durationMin - left;
      }
      return {
        eventType: 'feeding',
        details: {
          feeding_type: 'breast',
          breast_side: breastSide,
          duration_min: durationMin,
          left_duration_min: left,
          right_duration_min: right,
          started_at: started,
          ended_at: ended,
        },
      };
    }
    case 'Сон': {
      const started = row.start ? toIso(row.start) : toIso(row.datetime);
      const explicitDuration = valNum != null ? Math.round(valNum / 60) : null;
      const ended = row.end ? toIso(row.end) : addMinIso(started, explicitDuration);
      return {
        eventType: 'sleep',
        details: {
          sleep_type: row.type === 'Ночной' ? 'night' : 'nap',
          started_at: started,
          ended_at: ended,
          duration_min: explicitDuration ?? diffMin(started, ended),
        },
      };
    }
    case 'Подгузник': {
      const map: Record<string, string> = { Грязный: 'dirty', Мокрый: 'wet', Смешанный: 'mixed' };
      return { eventType: 'diaper', details: { diaper_type: map[row.type] || 'dirty' } };
    }
    case 'Вес':
      return { eventType: 'weight', details: { weight_kg: num(row.value.replace(' кг', '')) ?? valNum ?? 0 } };
    case 'Рост':
      return { eventType: 'growth', details: { height_cm: num(row.value.replace(' см', '')) ?? valNum ?? 0 } };
    case 'Прогулка': {
      const started = row.start ? toIso(row.start) : toIso(row.datetime);
      const explicitDuration = valNum != null ? Math.round(valNum / 60) : null;
      const ended = row.end ? toIso(row.end) : addMinIso(started, explicitDuration);
      return {
        eventType: 'walk',
        details: {
          duration_min: explicitDuration ?? diffMin(started, ended),
          started_at: started,
          ended_at: ended,
        },
      };
    }
    case 'Настроение':
      return { eventType: 'mood', details: null, note: row.type || row.value };
    default:
      return { eventType: 'note', details: null, note: `${row.event}: ${row.type} ${row.value}`.trim() };
  }
}
