import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useCreateEvent,
  useEvent,
  useStartTimer,
  useUpdateEvent,
} from '@acme/baby-bot-data-access';
import { LoadingButton, useUiStore } from '@acme/baby-bot-ui';
import {
  CreateEventPayload,
  EventType,
  EventTypeSchema,
  eventLabel,
  nowLocalInput,
  toLocalDateTimeInput,
} from '@acme/baby-bot-domain';
import styles from './screens.module.css';

const EVENT_TYPES = EventTypeSchema.options;

type FormState = Record<string, string>;

/** Fields rendered per event type (key, label, type). */
const FIELDS: Partial<Record<EventType, Array<{ key: string; label: string; type: 'text' | 'number' | 'select'; options?: string[] }>>> = {
  feeding: [
    { key: 'feeding_type', label: 'Тип', type: 'select', options: ['breast', 'bottle', 'solid', 'mixed', 'water'] },
    { key: 'breast_side', label: 'Грудь', type: 'select', options: ['', 'left', 'right', 'both'] },
    { key: 'amount_ml', label: 'Объём (мл)', type: 'number' },
    { key: 'food_name', label: 'Что (название)', type: 'text' },
  ],
  sleep: [{ key: 'sleep_type', label: 'Тип', type: 'select', options: ['nap', 'night'] }],
  diaper: [{ key: 'diaper_type', label: 'Тип', type: 'select', options: ['wet', 'dirty', 'mixed'] }],
  growth: [
    { key: 'height_cm', label: 'Рост (см)', type: 'number' },
    { key: 'head_circumference_cm', label: 'Окр. головы (см)', type: 'number' },
  ],
  weight: [{ key: 'weight_kg', label: 'Вес (кг)', type: 'number' }],
  health: [
    { key: 'health_type', label: 'Тип', type: 'select', options: ['temperature', 'vaccination', 'doctor', 'medication', 'illness'] },
    { key: 'value', label: 'Значение', type: 'number' },
    { key: 'description', label: 'Описание', type: 'text' },
  ],
  milestone: [
    { key: 'category', label: 'Категория', type: 'select', options: ['motor', 'speech', 'social', 'cognitive'] },
    { key: 'title', label: 'Название', type: 'text' },
  ],
  pumping: [
    { key: 'breast_side', label: 'Грудь', type: 'select', options: ['', 'left', 'right', 'both'] },
    { key: 'amount_ml', label: 'Объём (мл)', type: 'number' },
  ],
};

const NUMERIC = new Set(['amount_ml', 'height_cm', 'head_circumference_cm', 'weight_kg', 'value', 'duration_min']);

export function AddEvent() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const [search] = useSearchParams();
  const editId = params.id ? Number(params.id) : null;
  const existing = useEvent(editId);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const startTimer = useStartTimer();
  const addToast = useUiStore((s) => s.addToast);

  const [type, setType] = useState<EventType>((search.get('type') as EventType) || 'feeding');
  const [occurredAt, setOccurredAt] = useState(nowLocalInput());
  const [note, setNote] = useState('');
  const [form, setForm] = useState<FormState>({});

  useEffect(() => {
    if (existing.data) {
      setType(existing.data.event_type);
      setOccurredAt(toLocalDateTimeInput(existing.data.occurred_at));
      setNote(existing.data.note ?? '');
      const d = (existing.data.details ?? {}) as Record<string, unknown>;
      const next: FormState = {};
      for (const [k, v] of Object.entries(d)) if (v != null) next[k] = String(v);
      setForm(next);
    }
  }, [existing.data]);

  const buildDetails = (): Record<string, unknown> | undefined => {
    const fields = FIELDS[type];
    if (!fields) return undefined;
    const details: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = form[f.key];
      if (raw === undefined || raw === '') continue;
      details[f.key] = NUMERIC.has(f.key) ? Number(raw) : raw;
    }
    return Object.keys(details).length ? details : undefined;
  };

  const onSave = () => {
    const payload: CreateEventPayload = {
      event_type: type,
      occurred_at: new Date(occurredAt).toISOString(),
      note: note || undefined,
      details: buildDetails(),
    };
    const done = () => {
      addToast(editId ? 'Изменено' : 'Сохранено', 'success');
      navigate(-1);
    };
    if (editId) updateEvent.mutate({ id: editId, payload }, { onSuccess: done });
    else createEvent.mutate(payload, { onSuccess: done });
  };

  const fields = FIELDS[type] ?? [];

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>{editId ? 'Изменить' : 'Добавить'}</h1>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Тип события</label>
        <select className={styles.select} value={type} onChange={(e) => setType(e.target.value as EventType)} disabled={!!editId}>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {eventLabel(t)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Время</label>
        <input className={styles.input} type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
      </div>

      {fields.map((f) => (
        <div className={styles.field} key={f.key}>
          <label className={styles.label}>{f.label}</label>
          {f.type === 'select' ? (
            <select
              className={styles.select}
              value={form[f.key] ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
            >
              {f.options?.map((o) => (
                <option key={o} value={o}>
                  {o || '—'}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={styles.input}
              type={f.type}
              value={form[f.key] ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
            />
          )}
        </div>
      ))}

      <div className={styles.field}>
        <label className={styles.label}>Заметка</label>
        <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <LoadingButton loading={createEvent.isPending || updateEvent.isPending} onClick={onSave}>
        {editId ? 'Сохранить' : 'Добавить'}
      </LoadingButton>

      {!editId && ['feeding', 'sleep', 'walk', 'pumping', 'bath'].includes(type) && (
        <LoadingButton
          variant="ghost"
          loading={startTimer.isPending}
          onClick={() =>
            startTimer.mutate(
              { eventType: type },
              { onSuccess: () => { addToast('Таймер запущен', 'success'); navigate('/'); } },
            )
          }
        >
          Запустить таймер
        </LoadingButton>
      )}
    </div>
  );
}
