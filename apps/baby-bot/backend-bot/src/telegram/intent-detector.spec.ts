import { detectIntent } from './intent-detector';

describe('detectIntent', () => {
  it('treats a "when was the last feeding" question as a query, not a record', () => {
    expect(detectIntent('когда кормили?')).toEqual({ type: 'query_last', event_type: 'feeding' });
  });

  it('detects sleep and stats queries', () => {
    expect(detectIntent('сколько спал сегодня?')).toEqual({ type: 'query_sleep' });
    expect(detectIntent('покажи статистику?')).toEqual({ type: 'query_today_stats' });
  });

  it('treats a free-form statement as a record', () => {
    expect(detectIntent('покормила грудью в 14:00')).toEqual({ type: 'record' });
  });
});
