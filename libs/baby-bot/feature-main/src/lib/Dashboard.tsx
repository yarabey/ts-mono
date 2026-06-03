import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useActiveEvents,
  useChild,
  useCloseEvent,
  useCreateEvent,
  useQuickButtons,
  useSetting,
  useStats,
} from '@acme/baby-bot-data-access';
import {
  DEFAULT_THRESHOLDS,
  EventCard,
  LoadingButton,
  type NotifyThresholds,
  QuickButtons,
  Skeleton,
  SmartAlerts,
  Timer,
  impactLight,
  notificationSuccess,
  useUiStore,
} from '@acme/baby-bot-ui';
import { ageFromBirth, type Event, formatDuration } from '@acme/baby-bot-domain';
import styles from './Dashboard.module.css';

function useThresholds(): NotifyThresholds {
  const setting = useSetting('notify_thresholds');
  if (!setting.data?.value) return DEFAULT_THRESHOLDS;
  try {
    return { ...DEFAULT_THRESHOLDS, ...JSON.parse(setting.data.value) };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export function Dashboard() {
  const navigate = useNavigate();
  const child = useChild();
  const stats = useStats('today');
  const active = useActiveEvents();
  const quickButtons = useQuickButtons();
  const createEvent = useCreateEvent();
  const closeEvent = useCloseEvent();
  const thresholds = useThresholds();
  const addToast = useUiStore((s) => s.addToast);

  const [editing, setEditing] = useState<'weight' | 'height' | null>(null);
  const [growthInput, setGrowthInput] = useState('');

  const lastGrowth = stats.data?.last_growth ?? null;
  const wakeWindow = stats.data?.wake_window ?? null;
  const activeEvents = active.data?.events ?? [];
  const activeSleep = activeEvents.find((e) => e.event_type === 'sleep');
  const isSleeping = !!activeSleep;

  const startEdit = (type: 'weight' | 'height') => {
    setEditing(type);
    const current = type === 'weight' ? lastGrowth?.weight_kg : lastGrowth?.height_cm;
    setGrowthInput(current != null ? String(current) : '');
  };

  const saveGrowth = () => {
    const val = parseFloat(growthInput);
    if (Number.isNaN(val) || val <= 0) return;
    const payload =
      editing === 'weight'
        ? { event_type: 'weight' as const, details: { weight_kg: val } }
        : { event_type: 'growth' as const, details: { height_cm: val } };
    createEvent.mutate(payload, {
      onSuccess: () => {
        notificationSuccess();
        addToast(editing === 'weight' ? 'Вес сохранён' : 'Рост сохранён', 'success');
        setEditing(null);
        setGrowthInput('');
      },
      onError: (e) => addToast(e instanceof Error ? e.message : 'Ошибка', 'error'),
    });
  };

  const toggleSleep = () => {
    impactLight();
    if (activeSleep) {
      closeEvent.mutate(activeSleep.id, {
        onSuccess: () => {
          notificationSuccess();
          addToast('Малыш проснулся!', 'success');
        },
      });
    } else {
      createEvent.mutate(
        { event_type: 'sleep', details: { started_at: new Date().toISOString() } },
        {
          onSuccess: () => {
            notificationSuccess();
            addToast('Малыш уснул', 'success');
          },
        },
      );
    }
  };

  const wakeClass =
    wakeWindow && wakeWindow.current_min != null
      ? wakeWindow.current_min >= wakeWindow.recommended_max
        ? styles.wakeCrit
        : wakeWindow.current_min >= wakeWindow.recommended_max * 0.75
          ? styles.wakeWarn
          : styles.wakeOk
      : styles.wakeOk;

  const renderMeasure = (type: 'weight' | 'height') => {
    const isEditing = editing === type;
    const label = type === 'weight' ? 'Вес' : 'Рост';
    const unit = type === 'weight' ? 'кг' : 'см';
    const value = type === 'weight' ? lastGrowth?.weight_kg : lastGrowth?.height_cm;
    return (
      <div className={`${styles.measureCard} ${type === 'weight' ? styles.weightCard : styles.heightCard}`}>
        {isEditing ? (
          <div className={styles.editRow}>
            <input
              autoFocus
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              className={styles.editInput}
              value={growthInput}
              onChange={(e) => setGrowthInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditing(null);
                if (e.key === 'Enter') saveGrowth();
              }}
            />
            <button
              type="button"
              className={styles.editSave}
              disabled={createEvent.isPending || !growthInput}
              onClick={saveGrowth}
            >
              {createEvent.isPending ? '…' : '✓'}
            </button>
            <button type="button" className={styles.editCancel} onClick={() => setEditing(null)}>
              ✕
            </button>
          </div>
        ) : (
          <button type="button" className={styles.measureBtn} onClick={() => startEdit(type)}>
            <div className={styles.measureLabel}>{label}</div>
            <div className={styles.measureValue}>{value != null ? `${value} ${unit}` : `— ${unit}`}</div>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.identity}>
          {child.data ? `${child.data.name}  •  ${ageFromBirth(child.data.birth_date)}` : 'Загрузка…'}
        </div>
        <button type="button" className={styles.gear} aria-label="Настройки" onClick={() => navigate('/profile')}>
          ⚙️
        </button>
      </div>

      <div className={styles.measureRow}>
        {renderMeasure('weight')}
        {renderMeasure('height')}
      </div>

      <div className={`${styles.sleepCard} ${isSleeping ? styles.sleepCardSleeping : ''}`}>
        <div className={styles.sleepState}>{isSleeping ? 'Спит' : 'Бодрствует'}</div>
        {isSleeping && (
          <div className={styles.timerWrap}>
            <Timer
              startedAt={
                (activeSleep?.details as { started_at?: string } | null)?.started_at ??
                activeSleep?.occurred_at ??
                new Date().toISOString()
              }
            />
          </div>
        )}
        {!isSleeping && wakeWindow?.last_sleep_ended_at && (
          <div className={`${styles.wakeMonitor} ${wakeClass}`}>
            <div className={styles.sleepState}>С последнего пробуждения</div>
            <div className={styles.timerWrap}>
              <Timer startedAt={wakeWindow.last_sleep_ended_at} />
            </div>
          </div>
        )}
        <LoadingButton
          className={styles.sleepToggle}
          variant="ghost"
          loading={closeEvent.isPending || createEvent.isPending}
          onClick={toggleSleep}
        >
          {isSleeping ? 'Проснулся' : 'Уснул'}
        </LoadingButton>
      </div>

      {stats.data && <SmartAlerts stats={stats.data} thresholds={thresholds} onNavigate={navigate} />}

      {activeEvents.length > 0 && (
        <div className={styles.activeSection}>
          <div className={styles.activeTitle}>Активные</div>
          {activeEvents.map((e: Event) => (
            <EventCard
              key={e.id}
              event={e}
              onClick={() => navigate(`/event/${e.id}`)}
              onClose={() =>
                closeEvent.mutate(e.id, {
                  onSuccess: () => {
                    notificationSuccess();
                    addToast('Событие закрыто', 'success');
                  },
                  onError: (err) =>
                    addToast(err instanceof Error ? err.message : 'Не удалось закрыть', 'error'),
                })
              }
            />
          ))}
        </div>
      )}

      <div className={styles.quickWrap}>
        <QuickButtons types={quickButtons.data} onSelect={(type) => navigate(`/add/${type}`)} />
      </div>

      <div className={styles.todaySummary}>
        <div className={styles.todayTitle}>Статистика за сегодня</div>
        {stats.isLoading ? (
          <Skeleton height={20} />
        ) : (
          <div className={styles.todayRow}>
            <span>🍼 {stats.data?.feedings.total ?? 0}</span>
            <span>😴 {formatDuration(stats.data?.sleep.total_duration_min ?? 0)}</span>
            <span>🧷 {stats.data?.diapers.total ?? 0}</span>
          </div>
        )}
      </div>
    </div>
  );
}
