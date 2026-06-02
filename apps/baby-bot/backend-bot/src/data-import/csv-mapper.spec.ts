import { parseCsv, mapDetails, uniqueKey, rowHash, EVENT_MAP } from './csv-mapper';

const CSV = [
  'Дата и время,Событие,Тип,Значение,Значение.Число,Начало,Окончание,Комментарий',
  '2026-06-01 10:00:00,Бутылочка,Смесь,90 мл,90,,,',
  '2026-06-01 12:00:00,Сон,Ночной,,3600,2026-06-01 12:00:00,2026-06-01 13:00:00,',
  '2026-06-01 14:00:00,Подгузник,Мокрый,,,,,',
].join('\n');

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
