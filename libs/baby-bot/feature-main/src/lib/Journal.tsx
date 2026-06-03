import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useClearAllEvents,
  useCloseEvent,
  useDeleteEvent,
  useInfiniteEvents,
  useRawEntries,
  useRetryRawEntry,
} from '@acme/baby-bot-data-access';
import {
  EventCard,
  LoadingButton,
  RawEntryCard,
  SkeletonCard,
  notificationError,
  notificationSuccess,
  useUiStore,
} from '@acme/baby-bot-ui';
import {
  type Event,
  type EventType,
  formatDate,
  isOpenEvent,
  type RawEntry,
} from '@acme/baby-bot-domain';
import styles from './Journal.module.css';

const FILTERS: { type: EventType | 'all'; label: string }[] = [
  { type: 'all', label: 'Все' },
  { type: 'feeding', label: 'Корм.' },
  { type: 'sleep', label: 'Сон' },
  { type: 'diaper', label: 'Подг.' },
  { type: 'growth', label: 'Рост' },
  { type: 'health', label: 'Здор.' },
  { type: 'milestone', label: 'Вехи' },
  { type: 'note', label: 'Заметки' },
  { type: 'pumping', label: 'Сцеж.' },
  { type: 'walk', label: 'Прогул.' },
  { type: 'mood', label: 'Настр.' },
  { type: 'bath', label: 'Куп.' },
  { type: 'weight', label: 'Вес' },
];

type JournalItem =
  | { kind: 'event'; data: Event; date: string; ts: string }
  | { kind: 'raw'; data: RawEntry; date: string; ts: string };

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function Journal() {
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const [filter, setFilter] = useState<EventType | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showProcessed, setShowProcessed] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Debounce the search box (300ms) before it hits the query.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const eventsQuery = useInfiniteEvents({
    event_type: filter !== 'all' ? filter : undefined,
    search: search || undefined,
  });
  const rawEntriesQuery = useRawEntries({ limit: 50 });
  const closeEvent = useCloseEvent();
  const deleteEvent = useDeleteEvent();
  const clearAll = useClearAllEvents();
  const retry = useRetryRawEntry();

  const total = eventsQuery.data?.pages[0]?.total ?? 0;
  const events = useMemo(
    () => eventsQuery.data?.pages.flatMap((p) => p.events) ?? [],
    [eventsQuery.data],
  );
  const rawEntries = rawEntriesQuery.data?.entries ?? [];

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !eventsQuery.hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !eventsQuery.isFetchingNextPage) eventsQuery.fetchNextPage();
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eventsQuery.hasNextPage, eventsQuery.isFetchingNextPage, eventsQuery]);

  const groups = useMemo(() => {
    const items: JournalItem[] = [];
    const seen = new Set<number>();
    for (const e of events) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      const start = (e.details as { started_at?: string } | null)?.started_at || e.occurred_at;
      items.push({ kind: 'event', data: e, date: dayKey(start), ts: start });
    }
    for (const r of rawEntries) {
      if (!showProcessed && r.status === 'processed') continue;
      items.push({ kind: 'raw', data: r, date: dayKey(r.recorded_at), ts: r.recorded_at });
    }
    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    const out: [string, JournalItem[]][] = [];
    for (const item of items) {
      const last = out[out.length - 1];
      if (last && last[0] === item.date) last[1].push(item);
      else out.push([item.date, [item]]);
    }
    return out;
  }, [events, rawEntries, showProcessed]);

  const handleClose = (event: Event) => {
    closeEvent.mutate(event.id, {
      onSuccess: () => {
        notificationSuccess();
        addToast('Событие закрыто', 'success');
      },
      onError: (e) => {
        notificationError();
        addToast(e instanceof Error ? e.message : 'Не удалось закрыть', 'error');
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteEvent.mutate(id, {
      onSuccess: () => {
        notificationSuccess();
        addToast('Событие удалено', 'success');
        setDeleteConfirm(null);
      },
      onError: (e) => {
        notificationError();
        addToast(e instanceof Error ? e.message : 'Не удалось удалить', 'error');
        setDeleteConfirm(null);
      },
    });
  };

  const handleClearAll = () => {
    clearAll.mutate(undefined, {
      onSuccess: () => {
        notificationSuccess();
        addToast('Все события удалены', 'success');
        setConfirmClear(false);
      },
      onError: (e) => addToast(e instanceof Error ? e.message : 'Не удалось очистить', 'error'),
    });
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Журнал</h1>
          <div className={styles.headerActions}>
            <span className={styles.count}>{total} событий</span>
            {total > 0 &&
              (confirmClear ? (
                <>
                  <LoadingButton
                    className={`${styles.smallBtn} ${styles.smallBtnDanger}`}
                    loading={clearAll.isPending}
                    onClick={handleClearAll}
                  >
                    Да
                  </LoadingButton>
                  <button type="button" className={styles.smallBtn} onClick={() => setConfirmClear(false)}>
                    Нет
                  </button>
                </>
              ) : (
                <button type="button" className={styles.smallBtn} onClick={() => setConfirmClear(true)}>
                  Очистить
                </button>
              ))}
          </div>
        </div>
        <label className={styles.processedToggle}>
          <input type="checkbox" checked={showProcessed} onChange={() => setShowProcessed((v) => !v)} />
          <span>Обработанные записи</span>
        </label>
      </div>

      <div className={styles.searchWrap}>
        <input
          className={styles.search}
          type="text"
          placeholder="Поиск..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f.type}
            type="button"
            className={`${styles.pill} ${filter === f.type ? styles.pillActive : ''}`}
            onClick={() => setFilter(f.type)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {eventsQuery.isLoading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : groups.length === 0 ? (
        <div className={styles.empty}>Нет событий</div>
      ) : (
        groups.map(([date, items]) => (
          <div key={date}>
            <div className={styles.dateHeader}>{formatDate(date)}</div>
            {items.map((item) =>
              item.kind === 'event' ? (
                <div key={`e-${item.data.id}`} className={styles.eventRow}>
                  <div className={styles.eventCardWrap}>
                    <EventCard
                      event={item.data}
                      onClick={() => navigate(`/event/${item.data.id}`)}
                      onClose={isOpenEvent(item.data) ? handleClose : undefined}
                    />
                  </div>
                  {deleteConfirm === item.data.id ? (
                    <div className={styles.confirmInline}>
                      <LoadingButton
                        className={`${styles.smallBtn} ${styles.smallBtnDanger}`}
                        loading={deleteEvent.isPending}
                        onClick={() => handleDelete(item.data.id)}
                      >
                        Удалить?
                      </LoadingButton>
                      <button type="button" className={styles.smallBtn} onClick={() => setDeleteConfirm(null)}>
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.deleteX}
                      aria-label="Удалить"
                      onClick={() => setDeleteConfirm(item.data.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <RawEntryCard
                  key={`r-${item.data.id}`}
                  entry={item.data}
                  onRetry={() =>
                    new Promise<void>((resolve) =>
                      retry.mutate(item.data.id, {
                        onSettled: () => resolve(),
                        onSuccess: () => addToast('Отправлено на перепроверку', 'success'),
                      }),
                    )
                  }
                />
              ),
            )}
          </div>
        ))
      )}

      {eventsQuery.hasNextPage && <div ref={sentinelRef} className={styles.sentinel} />}
      {eventsQuery.isFetchingNextPage && <div className={styles.loadingText}>Загрузка...</div>}
    </div>
  );
}
