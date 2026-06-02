import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useActiveEvents,
  useQuickDiaper,
  useQuickFeeding,
  useStats,
  useStopTimer,
  useTimers,
} from '@acme/baby-bot-data-access';
import {
  BottomSheet,
  EventCard,
  LoadingButton,
  QuickButtons,
  Skeleton,
  Timer,
  useUiStore,
} from '@acme/baby-bot-ui';
import { eventLabel, formatDuration } from '@acme/baby-bot-domain';
import styles from './screens.module.css';

export function Dashboard() {
  const navigate = useNavigate();
  const stats = useStats('today');
  const timers = useTimers();
  const active = useActiveEvents();
  const quickFeeding = useQuickFeeding();
  const quickDiaper = useQuickDiaper();
  const stopTimer = useStopTimer();
  const { activeSheet, openSheet, closeSheet, addToast } = useUiStore();
  const [feedingType, setFeedingType] = useState('breast');
  const [diaperType, setDiaperType] = useState('wet');

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Дневник 🐣</h1>
      </div>

      <QuickButtons
        onQuickFeeding={() => openSheet('quick-feeding')}
        onQuickDiaper={() => openSheet('quick-diaper')}
        onStartTimer={() => navigate('/event?timer=1')}
        onAddNote={() => navigate('/event?type=note')}
      />

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Сегодня</div>
        {stats.isLoading ? (
          <Skeleton height={64} />
        ) : stats.data ? (
          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.data.feedings.total}</div>
              <div className={styles.statLabel}>Кормлений</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{formatDuration(stats.data.sleep.total_duration_min)}</div>
              <div className={styles.statLabel}>Сон</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.data.diapers.total}</div>
              <div className={styles.statLabel}>Подгузников</div>
            </div>
          </div>
        ) : null}
      </section>

      {!!timers.data?.timers.length && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Таймеры</div>
          {timers.data.timers.map((t) => (
            <Timer
              key={t.timer_id}
              label={eventLabel(t.event_type)}
              startedAt={t.started_at}
              stopping={stopTimer.isPending}
              onStop={() =>
                stopTimer.mutate(t.timer_id, { onSuccess: () => addToast('Таймер остановлен', 'success') })
              }
            />
          ))}
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Активные события</div>
        {active.data?.events.length ? (
          active.data.events.map((e) => <EventCard key={e.id} event={e} />)
        ) : (
          <div className={styles.empty}>Нет активных событий</div>
        )}
      </section>

      <BottomSheet open={activeSheet === 'quick-feeding'} title="Быстрое кормление" onClose={closeSheet}>
        <div className={styles.row}>
          {['breast', 'bottle', 'water'].map((t) => (
            <button
              key={t}
              className={`${styles.chip} ${feedingType === t ? styles.chipActive : ''}`}
              onClick={() => setFeedingType(t)}
            >
              {t === 'breast' ? 'Грудь' : t === 'bottle' ? 'Бутылочка' : 'Вода'}
            </button>
          ))}
        </div>
        <LoadingButton
          loading={quickFeeding.isPending}
          onClick={() =>
            quickFeeding.mutate(
              { feeding_type: feedingType },
              { onSuccess: () => { addToast('Кормление записано', 'success'); closeSheet(); } },
            )
          }
        >
          Записать
        </LoadingButton>
      </BottomSheet>

      <BottomSheet open={activeSheet === 'quick-diaper'} title="Быстрый подгузник" onClose={closeSheet}>
        <div className={styles.row}>
          {['wet', 'dirty', 'mixed'].map((t) => (
            <button
              key={t}
              className={`${styles.chip} ${diaperType === t ? styles.chipActive : ''}`}
              onClick={() => setDiaperType(t)}
            >
              {t === 'wet' ? 'Мокрый' : t === 'dirty' ? 'Грязный' : 'Смешанный'}
            </button>
          ))}
        </div>
        <LoadingButton
          loading={quickDiaper.isPending}
          onClick={() =>
            quickDiaper.mutate(
              { diaper_type: diaperType },
              { onSuccess: () => { addToast('Подгузник записан', 'success'); closeSheet(); } },
            )
          }
        >
          Записать
        </LoadingButton>
      </BottomSheet>
    </div>
  );
}
