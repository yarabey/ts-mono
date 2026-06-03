import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCreateEvent,
  useDeleteEvent,
  useEvent,
  usePhotoUpload,
  useUpdateEvent,
} from '@acme/baby-bot-data-access';
import { LoadingButton, TimeInput, notificationError, notificationSuccess, useUiStore } from '@acme/baby-bot-ui';
import {
  BOTTLE_CONTENT_LABELS,
  BOTTLE_CONTENTS,
  BREAST_SIDE_LABELS,
  BREAST_SIDE_SHORT_LABELS,
  type CreateEventPayload,
  DIAPER_TYPE_LABELS,
  type EventType,
  eventLabel,
  FEEDING_TYPE_LABELS,
  FEEDING_TYPES,
  formatTime,
  HEALTH_CATALOG,
  HEALTH_TYPE_LABELS,
  MILESTONE_CATEGORIES,
  MILESTONE_CATEGORY_LABELS,
  MOOD_PRESETS,
  nowLocalInput,
  SLEEP_QUALITY_LABELS,
  SLEEP_TYPE_LABELS,
  toLocalDateTimeInput,
} from '@acme/baby-bot-domain';
import styles from './AddEvent.module.css';

const KNOWN_BOTTLE = ['breast_milk', 'formula', 'water'];

type FormData = {
  occurred_at: string;
  note: string;
  feeding_type: string;
  breast_side: string;
  left_duration_min: string;
  right_duration_min: string;
  amount_ml: string;
  food_name: string;
  sleep_type: string;
  started_at: string;
  ended_at: string;
  quality: string;
  diaper_type: string;
  color: string;
  weight_kg: string;
  height_cm: string;
  head_circumference_cm: string;
  health_type: string;
  value: string;
  description: string;
  category: string;
  title: string;
  medication: string;
  vaccine_name: string;
  doctor_name: string;
  is_open: boolean;
};

const defaultForm = (): FormData => ({
  occurred_at: nowLocalInput(),
  note: '',
  feeding_type: 'breast',
  breast_side: 'left',
  left_duration_min: '',
  right_duration_min: '',
  amount_ml: '',
  food_name: '',
  sleep_type: 'nap',
  started_at: nowLocalInput(),
  ended_at: nowLocalInput(),
  quality: 'normal',
  diaper_type: 'wet',
  color: '',
  weight_kg: '',
  height_cm: '',
  head_circumference_cm: '',
  health_type: 'temperature',
  value: '',
  description: '',
  category: 'motor',
  title: '',
  medication: '',
  vaccine_name: '',
  doctor_name: '',
  is_open: false,
});

const localToIso = (local: string) => (local ? new Date(local).toISOString() : undefined);
const hhmm = (local: string) => local.slice(11, 16);
const withTime = (local: string, time: string) => local.slice(0, 11) + time;

interface OptProps {
  active: boolean;
  ongoing?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}
function Opt({ active, ongoing, onClick, children }: OptProps) {
  const cls = active ? (ongoing ? styles.optionOngoing : styles.optionActive) : '';
  return (
    <button type="button" className={`${styles.option} ${cls}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function AddEvent() {
  const navigate = useNavigate();
  const params = useParams<{ type?: string; id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const existing = useEvent(editId);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const photoUpload = usePhotoUpload();
  const addToast = useUiStore((s) => s.addToast);

  const [form, setForm] = useState<FormData>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const eventType = (existing.data?.event_type ?? params.type ?? 'feeding') as EventType;
  const saving = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending || photoUpload.isPending;

  useEffect(() => {
    if (!editId) setForm(defaultForm());
  }, [params.type, editId]);

  useEffect(() => {
    const e = existing.data;
    if (!e) return;
    const d = (e.details ?? {}) as Record<string, unknown>;
    const isOpen = !!(
      d.started_at &&
      !d.ended_at &&
      ['feeding', 'sleep', 'walk', 'bath', 'pumping'].includes(e.event_type)
    );
    const str = (v: unknown) => (v != null ? String(v) : '');
    setForm({
      occurred_at: toLocalDateTimeInput(e.occurred_at),
      note: e.note ?? '',
      feeding_type: str(d.feeding_type) || 'breast',
      breast_side: str(d.breast_side) || 'left',
      left_duration_min: str(d.left_duration_min),
      right_duration_min: str(d.right_duration_min),
      amount_ml: str(d.amount_ml),
      food_name: str(d.food_name),
      sleep_type: str(d.sleep_type) || 'nap',
      started_at: toLocalDateTimeInput((d.started_at as string) ?? e.occurred_at),
      ended_at: isOpen ? nowLocalInput() : toLocalDateTimeInput((d.ended_at as string) ?? e.occurred_at),
      quality: str(d.quality) || 'normal',
      diaper_type: str(d.diaper_type) || 'wet',
      color: str(d.color),
      weight_kg: str(d.weight_kg),
      height_cm: str(d.height_cm),
      head_circumference_cm: str(d.head_circumference_cm),
      health_type: str(d.health_type) || 'temperature',
      value: str(d.value),
      description: str(d.description),
      category: str(d.category) || 'motor',
      title: str(d.title),
      medication: str(d.medication),
      vaccine_name: str(d.vaccine_name),
      doctor_name: str(d.doctor_name),
      is_open: isOpen,
    });
  }, [existing.data]);

  const update = (field: keyof FormData, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const toggleOpen = () => setForm((p) => ({ ...p, is_open: !p.is_open }));

  const buildPayload = (): CreateEventPayload => {
    const base: CreateEventPayload = {
      event_type: eventType,
      occurred_at: localToIso(form.occurred_at),
      note: form.note || undefined,
    };
    let details: Record<string, unknown> | undefined;

    switch (eventType) {
      case 'feeding': {
        const both = form.feeding_type === 'breast' && form.breast_side === 'both';
        details = {
          feeding_type: form.feeding_type,
          breast_side: form.feeding_type === 'breast' ? form.breast_side : undefined,
          left_duration_min: both && !form.is_open && form.left_duration_min ? parseInt(form.left_duration_min, 10) : undefined,
          right_duration_min: both && !form.is_open && form.right_duration_min ? parseInt(form.right_duration_min, 10) : undefined,
          amount_ml: form.amount_ml ? parseInt(form.amount_ml, 10) : undefined,
          food_name: form.food_name || undefined,
          started_at: form.is_open ? localToIso(form.occurred_at) : localToIso(form.started_at),
          ended_at: form.is_open ? undefined : localToIso(form.ended_at),
        };
        break;
      }
      case 'sleep':
        details = {
          sleep_type: form.sleep_type,
          started_at: localToIso(form.started_at),
          ended_at: form.is_open ? undefined : localToIso(form.ended_at),
          quality: form.is_open ? undefined : form.quality,
        };
        break;
      case 'diaper':
        details = { diaper_type: form.diaper_type, color: form.color || undefined };
        break;
      case 'growth':
        details = {
          height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
          head_circumference_cm: form.head_circumference_cm ? parseFloat(form.head_circumference_cm) : undefined,
        };
        break;
      case 'health':
        details = {
          health_type: form.health_type,
          value: form.value ? parseFloat(form.value) : undefined,
          description: form.description || undefined,
          medication: form.medication || undefined,
          vaccine_name: form.vaccine_name || undefined,
          doctor_name: form.doctor_name || undefined,
        };
        break;
      case 'milestone':
        details = { category: form.category, title: form.title, description: form.description || undefined };
        break;
      case 'weight':
        details = { weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined };
        break;
      case 'pumping':
        details = {
          breast_side: form.breast_side,
          amount_ml: form.amount_ml ? parseInt(form.amount_ml, 10) : undefined,
          started_at: form.is_open ? localToIso(form.occurred_at) : localToIso(form.started_at),
          ended_at: form.is_open ? undefined : localToIso(form.ended_at),
        };
        break;
      case 'walk':
      case 'bath':
        details = {
          started_at: form.is_open ? localToIso(form.occurred_at) : localToIso(form.started_at),
          ended_at: form.is_open ? undefined : localToIso(form.ended_at),
        };
        break;
      case 'note':
      case 'mood':
        base.note = form.note || undefined;
        break;
    }
    if (details) base.details = details;
    return base;
  };

  const handleSave = async () => {
    setError(null);
    try {
      let photoId: number | undefined;
      if (photoFile) photoId = (await photoUpload.mutateAsync(photoFile)).id;
      const payload = { ...buildPayload(), photo_id: photoId };
      if (editId) await updateEvent.mutateAsync({ id: editId, payload });
      else await createEvent.mutateAsync(payload);
      notificationSuccess();
      addToast(editId ? 'Изменено' : 'Сохранено', 'success');
      navigate(-1);
    } catch (e) {
      notificationError();
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    try {
      await deleteEvent.mutateAsync(editId);
      navigate(-1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка удаления');
    }
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const ongoingToggle = (
    <div className={styles.group}>
      <Opt active={form.is_open} ongoing onClick={toggleOpen}>
        {form.is_open ? '✓ Продолжается' : 'Продолжается'}
      </Opt>
    </div>
  );

  const timeFields = (withStart = true) => (
    <>
      {withStart && (
        <div className={styles.group}>
          <label className={styles.label}>Начало</label>
          <TimeInput value={hhmm(form.started_at)} onChange={(v) => update('started_at', withTime(form.started_at, v))} />
        </div>
      )}
      {!form.is_open && (
        <div className={styles.group}>
          <label className={styles.label}>Конец</label>
          <TimeInput value={hhmm(form.ended_at)} onChange={(v) => update('ended_at', withTime(form.ended_at, v))} />
        </div>
      )}
    </>
  );

  const catalogPicker = (
    items: { id: string; name_ru: string }[],
    field: keyof FormData,
    current: string,
  ) => {
    const names = items.map((i) => i.name_ru);
    return (
      <>
        <div className={styles.options}>
          {items.map((item) => (
            <Opt key={item.id} active={current === item.name_ru} onClick={() => update(field, item.name_ru)}>
              {item.name_ru}
            </Opt>
          ))}
        </div>
        <input
          className={styles.input}
          type="text"
          placeholder="Свой вариант..."
          value={names.includes(current) ? '' : current}
          onChange={(e) => update(field, e.target.value)}
        />
      </>
    );
  };

  const renderFeeding = () => (
    <>
      <div className={styles.group}>
        <label className={styles.label}>Тип</label>
        <div className={styles.options}>
          {FEEDING_TYPES.map((t) => (
            <Opt
              key={t}
              active={form.feeding_type === t}
              onClick={() => {
                update('feeding_type', t);
                if (t === 'bottle') update('food_name', 'breast_milk');
              }}
            >
              {FEEDING_TYPE_LABELS[t]}
            </Opt>
          ))}
        </div>
      </div>

      {form.feeding_type === 'breast' && (
        <>
          <div className={styles.group}>
            <label className={styles.label}>Сторона</label>
            <div className={styles.options}>
              {(['left', 'right', 'both'] as const).map((s) => (
                <Opt key={s} active={form.breast_side === s} onClick={() => update('breast_side', s)}>
                  {BREAST_SIDE_SHORT_LABELS[s]}
                </Opt>
              ))}
            </div>
          </div>
          {form.breast_side === 'both' && !form.is_open && (
            <>
              <div className={styles.group}>
                <label className={styles.label}>Левая (мин)</label>
                <input className={styles.input} type="number" value={form.left_duration_min} placeholder="10" onChange={(e) => update('left_duration_min', e.target.value)} />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Правая (мин)</label>
                <input className={styles.input} type="number" value={form.right_duration_min} placeholder="10" onChange={(e) => update('right_duration_min', e.target.value)} />
              </div>
            </>
          )}
          <div className={styles.group}>
            <label className={styles.label}>Объём (мл, необязательно)</label>
            <input className={styles.input} type="number" value={form.amount_ml} placeholder="120" onChange={(e) => update('amount_ml', e.target.value)} />
          </div>
        </>
      )}

      {form.feeding_type === 'bottle' && (
        <>
          <div className={styles.group}>
            <label className={styles.label}>Содержимое</label>
            <div className={styles.options}>
              {BOTTLE_CONTENTS.map((t) => {
                const active = (t !== 'other' && form.food_name === t) || (t === 'other' && !KNOWN_BOTTLE.includes(form.food_name));
                return (
                  <Opt key={t} active={active} onClick={() => update('food_name', t === 'other' ? '' : t)}>
                    {BOTTLE_CONTENT_LABELS[t]}
                  </Opt>
                );
              })}
            </div>
          </div>
          {!KNOWN_BOTTLE.includes(form.food_name) && (
            <div className={styles.group}>
              <label className={styles.label}>Что в бутылочке</label>
              <input className={styles.input} type="text" value={form.food_name} placeholder="Компот, чай..." onChange={(e) => update('food_name', e.target.value)} />
            </div>
          )}
          <div className={styles.group}>
            <label className={styles.label}>Объём (мл)</label>
            <input className={styles.input} type="number" value={form.amount_ml} placeholder="120" onChange={(e) => update('amount_ml', e.target.value)} />
          </div>
        </>
      )}

      {form.feeding_type === 'water' && (
        <div className={styles.group}>
          <label className={styles.label}>Объём (мл)</label>
          <input className={styles.input} type="number" value={form.amount_ml} placeholder="120" onChange={(e) => update('amount_ml', e.target.value)} />
        </div>
      )}

      {form.feeding_type === 'solid' && (
        <>
          <div className={styles.group}>
            <label className={styles.label}>Что ела</label>
            <input className={styles.input} type="text" value={form.food_name} placeholder="Пюре из тыквы" onChange={(e) => update('food_name', e.target.value)} />
          </div>
          <div className={styles.group}>
            <label className={styles.label}>Объём (мл, необязательно)</label>
            <input className={styles.input} type="number" value={form.amount_ml} placeholder="120" onChange={(e) => update('amount_ml', e.target.value)} />
          </div>
        </>
      )}

      {ongoingToggle}
      {!form.is_open && timeFields()}
    </>
  );

  const renderSleep = () => (
    <>
      <div className={styles.group}>
        <label className={styles.label}>Тип</label>
        <div className={styles.options}>
          {(['nap', 'night'] as const).map((t) => (
            <Opt key={t} active={form.sleep_type === t} onClick={() => update('sleep_type', t)}>
              {SLEEP_TYPE_LABELS[t]}
            </Opt>
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <label className={styles.label}>Начало</label>
        <TimeInput value={hhmm(form.started_at)} onChange={(v) => update('started_at', withTime(form.started_at, v))} />
      </div>
      {ongoingToggle}
      {!form.is_open && (
        <>
          <div className={styles.group}>
            <label className={styles.label}>Конец</label>
            <TimeInput value={hhmm(form.ended_at)} onChange={(v) => update('ended_at', withTime(form.ended_at, v))} />
          </div>
          <div className={styles.group}>
            <label className={styles.label}>Качество</label>
            <div className={styles.options}>
              {(['good', 'normal', 'bad'] as const).map((q) => (
                <Opt key={q} active={form.quality === q} onClick={() => update('quality', q)}>
                  {SLEEP_QUALITY_LABELS[q]}
                </Opt>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );

  const renderDiaper = () => (
    <div className={styles.group}>
      <label className={styles.label}>Тип</label>
      <div className={styles.options}>
        {(['wet', 'dirty', 'mixed'] as const).map((t) => (
          <Opt key={t} active={form.diaper_type === t} onClick={() => update('diaper_type', t)}>
            {DIAPER_TYPE_LABELS[t]}
          </Opt>
        ))}
      </div>
    </div>
  );

  const renderGrowth = () => (
    <>
      <div className={styles.group}>
        <label className={styles.label}>Рост (см)</label>
        <input className={styles.input} type="number" value={form.height_cm} placeholder="72" onChange={(e) => update('height_cm', e.target.value)} />
      </div>
      <div className={styles.group}>
        <label className={styles.label}>Окр. головы (см)</label>
        <input className={styles.input} type="number" value={form.head_circumference_cm} placeholder="45" onChange={(e) => update('head_circumference_cm', e.target.value)} />
      </div>
    </>
  );

  const renderHealth = () => (
    <>
      <div className={styles.group}>
        <label className={styles.label}>Тип</label>
        <div className={styles.options}>
          {(['temperature', 'vaccination', 'doctor', 'medication', 'illness'] as const).map((t) => (
            <Opt key={t} active={form.health_type === t} onClick={() => update('health_type', t)}>
              {HEALTH_TYPE_LABELS[t]}
            </Opt>
          ))}
        </div>
      </div>
      {form.health_type === 'temperature' && (
        <div className={styles.group}>
          <label className={styles.label}>Температура (°C)</label>
          <input className={styles.input} type="number" step="0.1" value={form.value} placeholder="36.6" onChange={(e) => update('value', e.target.value)} />
        </div>
      )}
      {form.health_type === 'vaccination' && (
        <div className={styles.group}>
          <label className={styles.label}>Название прививки</label>
          {catalogPicker(HEALTH_CATALOG.vaccination, 'vaccine_name', form.vaccine_name)}
        </div>
      )}
      {form.health_type === 'doctor' && (
        <div className={styles.group}>
          <label className={styles.label}>Специалист</label>
          {catalogPicker(HEALTH_CATALOG.doctor, 'doctor_name', form.doctor_name)}
        </div>
      )}
      {form.health_type === 'medication' && (
        <div className={styles.group}>
          <label className={styles.label}>Лекарство</label>
          {catalogPicker(HEALTH_CATALOG.medication, 'medication', form.medication)}
        </div>
      )}
      {form.health_type === 'illness' && (
        <div className={styles.group}>
          <label className={styles.label}>Что болит</label>
          <div className={styles.options}>
            {HEALTH_CATALOG.illness.map((item) => (
              <Opt key={item.id} active={form.description === item.name_ru} onClick={() => update('description', item.name_ru)}>
                {item.name_ru}
              </Opt>
            ))}
          </div>
          <textarea className={styles.textarea} rows={2} value={form.description} placeholder="Подробности..." onChange={(e) => update('description', e.target.value)} />
        </div>
      )}
      {form.health_type !== 'illness' && (
        <div className={styles.group}>
          <label className={styles.label}>Описание</label>
          <textarea className={styles.textarea} rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
      )}
    </>
  );

  const renderMilestone = () => (
    <>
      <div className={styles.group}>
        <label className={styles.label}>Категория</label>
        <div className={styles.options}>
          {MILESTONE_CATEGORIES.map((c) => (
            <Opt key={c} active={form.category === c} onClick={() => update('category', c)}>
              {MILESTONE_CATEGORY_LABELS[c]}
            </Opt>
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <label className={styles.label}>Что произошло</label>
        <input className={styles.input} type="text" value={form.title} placeholder="Первый зуб / Первые шаги..." onChange={(e) => update('title', e.target.value)} />
      </div>
      <div className={styles.group}>
        <label className={styles.label}>Описание</label>
        <textarea className={styles.textarea} rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} />
      </div>
    </>
  );

  const renderPumping = () => (
    <>
      <div className={styles.group}>
        <label className={styles.label}>Сторона</label>
        <div className={styles.options}>
          {(['left', 'right', 'both'] as const).map((s) => (
            <Opt key={s} active={form.breast_side === s} onClick={() => update('breast_side', s)}>
              {BREAST_SIDE_LABELS[s].charAt(0).toUpperCase() + BREAST_SIDE_LABELS[s].slice(1)}
            </Opt>
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <label className={styles.label}>Объём (мл)</label>
        <input className={styles.input} type="number" value={form.amount_ml} placeholder="150" onChange={(e) => update('amount_ml', e.target.value)} />
      </div>
      {ongoingToggle}
      {!form.is_open && timeFields()}
    </>
  );

  const renderWeight = () => (
    <div className={styles.group}>
      <label className={styles.label}>Вес (кг)</label>
      <input className={styles.input} type="number" step="0.01" value={form.weight_kg} placeholder="8.2" onChange={(e) => update('weight_kg', e.target.value)} />
    </div>
  );

  const renderMood = () => (
    <div className={styles.group}>
      <label className={styles.label}>Настроение</label>
      <div className={styles.options}>
        {MOOD_PRESETS.map((m) => (
          <Opt key={m} active={form.note === m} onClick={() => update('note', m)}>
            {m}
          </Opt>
        ))}
      </div>
      <input className={styles.input} type="text" value={form.note} placeholder="Свое описание..." onChange={(e) => update('note', e.target.value)} />
    </div>
  );

  const renderNote = () => (
    <div className={styles.group}>
      <textarea className={styles.textarea} rows={4} autoFocus value={form.note} placeholder="Текст заметки..." onChange={(e) => update('note', e.target.value)} />
    </div>
  );

  const renderTimeOnly = () => (
    <>
      {ongoingToggle}
      {!form.is_open && timeFields()}
    </>
  );

  const RENDERERS: Partial<Record<EventType, () => React.ReactNode>> = {
    feeding: renderFeeding,
    sleep: renderSleep,
    diaper: renderDiaper,
    growth: renderGrowth,
    health: renderHealth,
    milestone: renderMilestone,
    pumping: renderPumping,
    weight: renderWeight,
    mood: renderMood,
    note: renderNote,
    walk: renderTimeOnly,
    bath: renderTimeOnly,
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button type="button" className={styles.back} aria-label="Назад" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1 className={styles.title}>{eventLabel(eventType)}</h1>
        {existing.data && <span className={styles.createdAt}>Создано: {formatTime(existing.data.occurred_at)}</span>}
      </div>

      <div className={styles.body}>
        {RENDERERS[eventType]?.()}

        {eventType !== 'note' && eventType !== 'mood' && (
          <div className={styles.group}>
            <label className={styles.label}>Комментарий</label>
            <input className={styles.input} type="text" value={form.note} onChange={(e) => update('note', e.target.value)} />
          </div>
        )}

        <div className={styles.group}>
          <label className={styles.label}>Фото (необязательно)</label>
          <div className={styles.photoRow}>
            <label className={styles.photoLabel}>
              📷 Выбрать
              <input type="file" accept="image/*" onChange={handlePhoto} />
            </label>
            {photoPreview && (
              <div className={styles.photoPreviewWrap}>
                <img className={styles.photoPreview} src={photoPreview} alt="превью" />
                <button type="button" className={styles.photoRemove} onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        {error && <div className={styles.error}>{error}</div>}
        <LoadingButton className={styles.saveBtn} loading={saving} onClick={handleSave}>
          Сохранить
        </LoadingButton>
        {editId &&
          (confirmDelete ? (
            <div className={styles.confirmRow}>
              <button type="button" className={styles.confirmBtn} onClick={handleDelete}>
                Подтвердить
              </button>
              <button type="button" className={styles.cancelBtn} onClick={() => setConfirmDelete(false)}>
                Отмена
              </button>
            </div>
          ) : (
            <button type="button" className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
              Удалить событие
            </button>
          ))}
      </div>
    </div>
  );
}
