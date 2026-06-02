export type Intent =
  | { type: 'query_last'; event_type: string }
  | { type: 'query_today_stats' }
  | { type: 'query_sleep' }
  | { type: 'query_weight' }
  | { type: 'query_diaper' }
  | { type: 'record' }
  | { type: 'unknown' };

/** Regex-based classification of a Telegram message: query vs record.
 * Ported verbatim from baby-ai's intent-detector. */
export function detectIntent(text: string): Intent {
  const t = text.toLowerCase().trim();

  if (
    t.endsWith('?') ||
    (/^[а-яё]/.test(t) &&
      t.length < 60 &&
      /^(когда|сколько|какой|как|где|кто|что|подскажи|скажи|покажи)\b/.test(t))
  ) {
    if (/корм|груд|бутылоч/.test(t)) return { type: 'query_last', event_type: 'feeding' };
    if (/подгуз|памперс/.test(t)) return { type: 'query_diaper' };
    if (/спал|сон|спит/.test(t)) return { type: 'query_sleep' };
    if (/\bвес\b|взвеш/.test(t)) return { type: 'query_weight' };
    if (/статистик|сводк|дела/.test(t)) return { type: 'query_today_stats' };
  }

  if (/^\/(today|stats|help|notify)/.test(t)) return { type: 'record' };

  if (/^последн/.test(t)) {
    if (/корм/.test(t)) return { type: 'query_last', event_type: 'feeding' };
    if (/подгуз|памперс/.test(t)) return { type: 'query_diaper' };
    if (/сон|спал/.test(t)) return { type: 'query_last', event_type: 'sleep' };
  }

  return { type: 'record' };
}
