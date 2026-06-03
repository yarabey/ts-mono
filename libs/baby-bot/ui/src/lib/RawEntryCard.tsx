import { useState } from 'react';
import {
  eventIcon,
  eventSummary,
  formatTime,
  type RawEntry,
} from '@acme/baby-bot-domain';
import styles from './RawEntryCard.module.css';

const SOURCE_ICONS: Record<string, string> = {
  telegram: '✈️',
  telegram_voice: '🎙️',
  alice: '🔊',
  miniapp: '📱',
  ai_parsed: '🤖',
};

function sourceIcon(source: string): string {
  return SOURCE_ICONS[source] ?? '📝';
}

function StatusIcon({ status }: { status: RawEntry['status'] }) {
  if (status === 'pending' || status === 'processing') {
    return <span className={`${styles.status} ${styles.spin}`} aria-label="обработка">⏳</span>;
  }
  if (status === 'processed') {
    return <span className={`${styles.status} ${styles.ok}`} aria-label="готово">✓</span>;
  }
  if (status === 'error' || status === 'needs_review') {
    return <span className={`${styles.status} ${styles.err}`} aria-label="ошибка">⚠️</span>;
  }
  return null;
}

function Popup({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className={styles.popupOverlay} onClick={onClose} role="presentation">
      <div className={styles.popup} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className={styles.popupHead}>
          <span className={styles.popupTitle}>{title}</span>
          <button type="button" className={styles.popupClose} onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export interface RawEntryCardProps {
  entry: RawEntry;
  /** Re-submit a failed/needs-review entry for parsing. */
  onRetry?: () => Promise<void> | void;
}

export function RawEntryCard({ entry, onRetry }: RawEntryCardProps) {
  const [showError, setShowError] = useState(false);
  const [showText, setShowText] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const isFailed = entry.status === 'error' || entry.status === 'needs_review';

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <>
      <div className={styles.card}>
        <span className={styles.sourceIcon}>{entry.emoji || sourceIcon(entry.source)}</span>
        <div className={styles.main}>
          <div className={styles.text} onClick={() => setShowText(true)} role="button" tabIndex={0}>
            {entry.text}
          </div>
          <div className={styles.meta}>
            <span>{formatTime(entry.recorded_at)}</span>
            <span>•</span>
            <span>{entry.source}</span>
            {isFailed && onRetry && (
              <button
                type="button"
                className={styles.retry}
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? 'Отправка…' : 'Перепроверить'}
              </button>
            )}
          </div>
          {entry.status === 'processed' && entry.linked_events && entry.linked_events.length > 0 && (
            <div className={styles.linked}>
              {entry.linked_events.map((ev) => (
                <div key={ev.id} className={styles.linkedRow}>
                  <span>{eventIcon(ev.event_type)}</span>
                  <span className={styles.linkedSummary}>{eventSummary(ev)}</span>
                  <span className={styles.linkedTime}>{formatTime(ev.occurred_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className={styles.statusBtn}
          onClick={() => (isFailed && entry.error_message ? setShowError(true) : undefined)}
        >
          <StatusIcon status={entry.status} />
        </button>
      </div>
      {showError && entry.error_message && (
        <Popup title="Ошибка обработки" onClose={() => setShowError(false)}>
          <pre className={styles.errorText}>{entry.error_message}</pre>
        </Popup>
      )}
      {showText && (
        <Popup title="Запись" onClose={() => setShowText(false)}>
          <p className={styles.fullText}>{entry.text}</p>
        </Popup>
      )}
    </>
  );
}
