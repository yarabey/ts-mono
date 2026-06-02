import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeleteEvent, useEvents, useRawEntries, useRetryRawEntry } from '@acme/baby-bot-data-access';
import { EventCard, LoadingButton, SkeletonCard, useUiStore } from '@acme/baby-bot-ui';
import { type Event, EventType, EventTypeSchema, eventLabel } from '@acme/baby-bot-domain';
import styles from './screens.module.css';

export function Journal() {
  const navigate = useNavigate();
  const [type, setType] = useState<EventType | ''>('');
  const [search, setSearch] = useState('');
  const events = useEvents({ event_type: type || undefined, search: search || undefined, limit: 100 });
  const rawEntries = useRawEntries({ limit: 50 });
  const deleteEvent = useDeleteEvent();
  const retry = useRetryRawEntry();
  const addToast = useUiStore((s) => s.addToast);

  const onDelete = (e: Event) => {
    if (typeof window !== 'undefined' && !window.confirm('Удалить событие?')) return;
    deleteEvent.mutate(e.id, { onSuccess: () => addToast('Удалено', 'success') });
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Журнал</h1>
      </div>

      <input className={styles.input} placeholder="Поиск…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className={styles.row}>
        <button className={`${styles.chip} ${type === '' ? styles.chipActive : ''}`} onClick={() => setType('')}>
          Все
        </button>
        {EventTypeSchema.options.slice(0, 6).map((t) => (
          <button key={t} className={`${styles.chip} ${type === t ? styles.chipActive : ''}`} onClick={() => setType(t)}>
            {eventLabel(t)}
          </button>
        ))}
      </div>

      <section className={styles.section}>
        {events.isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : events.data?.events.length ? (
          <div className={styles.list}>
            {events.data.events.map((e) => (
              <EventCard key={e.id} event={e} onEdit={(ev) => navigate(`/event/${ev.id}`)} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>Нет событий</div>
        )}
      </section>

      {!!rawEntries.data?.entries.length && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Необработанные записи</div>
          <div className={styles.list}>
            {rawEntries.data.entries.map((r) => (
              <div key={r.id} className={styles.statCard} style={{ textAlign: 'left' }}>
                <div>{r.text}</div>
                <div className={styles.statLabel}>{r.status}{r.error_message ? ` — ${r.error_message}` : ''}</div>
                {(r.status === 'error' || r.status === 'needs_review') && (
                  <LoadingButton
                    variant="ghost"
                    loading={retry.isPending}
                    onClick={() => retry.mutate(r.id, { onSuccess: () => addToast('Повтор поставлен', 'info') })}
                  >
                    Повторить
                  </LoadingButton>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
