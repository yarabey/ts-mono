import { parseCsv, mapDetails, uniqueKey, rowHash, EVENT_MAP } from './csv-mapper';

const CSV = [
  'Дата и время,Событие,Тип,Значение,Значение.Число,Начало,Окончание,Комментарий',
  '2026-06-01 10:00:00,Бутылочка,Смесь,90 мл,90,,,',
  '2026-06-01 12:00:00,Сон,Ночной,,3600,2026-06-01 12:00:00,2026-06-01 13:00:00,',
  '2026-06-01 14:00:00,Подгузник,Мокрый,,,,,',
].join('\n');

/** Helpers to assert two ISO instants differ by the expected minutes. */
const minutesBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);

describe('parseCsv', () => {
  it('parses header-mapped rows', () => {
    const rows = parseCsv(CSV);
    expect(rows).toHaveLength(3);
    expect(rows[0].event).toBe('Бутылочка');
    expect(rows[1].type).toBe('Ночной');
  });
});

describe('mapDetails', () => {
  it('maps a bottle feeding', () => {
    const m = mapDetails(parseCsv(CSV)[0]);
    expect(m.eventType).toBe('feeding');
    expect(m.details).toMatchObject({ feeding_type: 'bottle', amount_ml: 90 });
  });

  it('maps a night sleep with duration', () => {
    const m = mapDetails(parseCsv(CSV)[1]);
    expect(m.eventType).toBe('sleep');
    expect(m.details).toMatchObject({ sleep_type: 'night', duration_min: 60 });
  });

  it('maps a wet diaper', () => {
    const m = mapDetails(parseCsv(CSV)[2]);
    expect(m.eventType).toBe('diaper');
    expect(m.details).toMatchObject({ diaper_type: 'wet' });
  });

  it('keeps explicit start/end for sleep without collapsing them', () => {
    const m = mapDetails(parseCsv(CSV)[1]);
    const d = m.details as Record<string, string>;
    expect(d.started_at).toBeTruthy();
    expect(d.ended_at).toBeTruthy();
    expect(d.ended_at).not.toBe(d.started_at);
    expect(minutesBetween(d.started_at, d.ended_at)).toBe(60);
  });

  it('derives ended_at from start + duration when Окончание is empty (sleep)', () => {
    const [row] = parseCsv(
      ['Дата и время,Событие,Тип,Значение,Значение.Число,Начало,Окончание,Комментарий', '2026-06-01 22:00:00,Сон,Ночной,,1800,,,'].join('\n'),
    );
    const d = mapDetails(row).details as Record<string, string>;
    expect(d.started_at).toBe('2026-06-01T22:00:00');
    expect(d.ended_at).toBeTruthy();
    expect(minutesBetween(d.started_at, d.ended_at)).toBe(30);
    expect(d.duration_min).toBe(30);
  });

  it('derives ended_at from start + duration for walks', () => {
    const [row] = parseCsv(
      ['Дата и время,Событие,Тип,Значение,Значение.Число,Начало,Окончание,Комментарий', '2026-06-01 09:00:00,Прогулка,,,2700,,,'].join('\n'),
    );
    const d = mapDetails(row).details as Record<string, string | number>;
    expect(d.started_at).toBe('2026-06-01T09:00:00');
    expect(minutesBetween(d.started_at as string, d.ended_at as string)).toBe(45);
    expect(d.duration_min).toBe(45);
  });

  it('preserves start/end for pumping and derives its duration', () => {
    const [row] = parseCsv(
      [
        'Дата и время,Событие,Тип,Значение,Значение.Число,Начало,Окончание,Комментарий',
        '2026-06-01 08:00:00,Сцеживание,Левая,,120,2026-06-01 08:00:00,2026-06-01 08:20:00,',
      ].join('\n'),
    );
    const m = mapDetails(row);
    expect(m.eventType).toBe('pumping');
    const d = m.details as Record<string, string | number>;
    expect(d.breast_side).toBe('left');
    expect(d.amount_ml).toBe(120);
    expect(d.started_at).toBe('2026-06-01T08:00:00');
    expect(d.ended_at).toBe('2026-06-01T08:20:00');
    expect(d.duration_min).toBe(20);
  });
});

describe('dedup keys', () => {
  it('uniqueKey is stable and rowHash changes with content', () => {
    const [row] = parseCsv(CSV);
    expect(uniqueKey(row)).toBe('2026-06-01 10:00:00|Бутылочка|Смесь');
    const h1 = rowHash(row);
    expect(rowHash({ ...row, comment: 'changed' })).not.toBe(h1);
  });
});

describe('EVENT_MAP', () => {
  it('recognizes known Russian event labels', () => {
    expect(EVENT_MAP['Кормление грудью']).toBe('feeding');
    expect(EVENT_MAP['Прогулка']).toBe('walk');
  });
});
