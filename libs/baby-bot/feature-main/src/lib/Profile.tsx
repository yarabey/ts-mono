import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearToken,
  downloadCsvExport,
  useChild,
  useImportUpload,
  useQuickButtons,
  useSetting,
  useUpdateChild,
  useUpdateQuickButtons,
  useUpdateSetting,
} from '@acme/baby-bot-data-access';
import { LoadingButton, useUiStore } from '@acme/baby-bot-ui';
import {
  ageFromBirth,
  DEFAULT_QUICK_BUTTON_TYPES,
  eventIcon,
  eventLabel,
} from '@acme/baby-bot-domain';
import styles from './Profile.module.css';

const APP_VERSION = 'baby-bot v2.0';
const DEFAULT_THRESHOLDS = { feeding_min: 180, diaper_min: 240, wake_min: 150 };

/** Zones offered for CSV import (the file's timestamps are wall-clock with no
 * offset, so the user tells us which zone they were recorded in). */
const TIMEZONE_OPTIONS = [
  'Europe/Kaliningrad',
  'Europe/Moscow',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'UTC',
];

/** The browser's zone is the most likely answer, so it leads the list. */
function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

const IMPORT_TZ_OPTIONS = Array.from(new Set([browserTimeZone(), ...TIMEZONE_OPTIONS]));

export function Profile() {
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const childQuery = useChild();
  const child = childQuery.data;
  const updateChild = useUpdateChild();
  const quickButtons = useQuickButtons();
  const updateQuickButtons = useUpdateQuickButtons();
  const notifyChatId = useSetting('notify_chat_id');
  const thresholdsSetting = useSetting('notify_thresholds');
  const updateSetting = useUpdateSetting();
  const importUpload = useImportUpload();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [exporting, setExporting] = useState(false);
  const [importTz, setImportTz] = useState(IMPORT_TZ_OPTIONS[0]);

  useEffect(() => {
    if (child) {
      setName(child.name);
      setBirthDate(child.birth_date);
      setGender(child.gender ?? 'female');
    }
  }, [child]);

  useEffect(() => {
    if (quickButtons.config?.hidden) setHidden(new Set(quickButtons.config.hidden));
  }, [quickButtons.config]);

  useEffect(() => {
    if (thresholdsSetting.data?.value) {
      try {
        setThresholds({ ...DEFAULT_THRESHOLDS, ...JSON.parse(thresholdsSetting.data.value) });
      } catch {
        /* keep defaults */
      }
    }
  }, [thresholdsSetting.data]);

  const notifyEnabled = !!notifyChatId.data?.value;

  const saveChild = () => {
    if (child?.id == null) return;
    updateChild.mutate(
      { id: child.id, payload: { name, birth_date: birthDate, gender } },
      {
        onSuccess: () => {
          setEditing(false);
          addToast('Сохранено', 'success');
        },
        onError: (e) => addToast(e instanceof Error ? e.message : 'Ошибка сохранения', 'error'),
      },
    );
  };

  const toggleType = (type: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  const saveQuickButtons = () => {
    const visible = DEFAULT_QUICK_BUTTON_TYPES.filter((t) => !hidden.has(t));
    updateQuickButtons.mutate(
      { order: visible, hidden: [...hidden] },
      { onSuccess: () => addToast('Кнопки сохранены', 'success') },
    );
  };

  const saveThresholds = () =>
    updateSetting.mutate(
      {
        key: 'notify_thresholds',
        value: JSON.stringify({
          feeding_min: thresholds.feeding_min || 180,
          diaper_min: thresholds.diaper_min || 240,
          wake_min: thresholds.wake_min || 150,
        }),
      },
      { onSuccess: () => addToast('Пороги сохранены', 'success') },
    );

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCsvExport(undefined, 'baby-bot-export.csv');
      addToast('Экспорт завершён', 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Ошибка экспорта', 'error');
    } finally {
      setExporting(false);
    }
  };

  const onImportFile = (file: File | undefined) => {
    if (!file) return;
    importUpload.mutate({ file, timeZone: importTz }, {
      onSuccess: (res) => {
        const r = (res ?? {}) as { inserted?: number; updated?: number; errors?: string[] };
        const errors = r.errors?.length ?? 0;
        const summary = `Импорт: +${r.inserted ?? 0}, обновлено ${r.updated ?? 0}` + (errors ? `, ошибок ${errors}` : '');
        addToast(summary, errors ? 'error' : 'success');
      },
      onError: (e) => addToast(e instanceof Error ? e.message : 'Ошибка импорта', 'error'),
    });
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button type="button" className={styles.back} aria-label="Назад" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1 className={styles.title}>Профиль</h1>
      </div>

      {!child ? (
        <div className={styles.loading}>Загрузка...</div>
      ) : (
        <div className={styles.body}>
          <div className={styles.childRow}>
            <span className={styles.avatar}>👶</span>
            <div>
              <div className={styles.childName}>{child.name}</div>
              <div className={styles.childAge}>{ageFromBirth(child.birth_date)}</div>
            </div>
          </div>

          {editing ? (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Имя</label>
                <input className={styles.input} type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Дата рождения</label>
                <input className={styles.input} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Пол</label>
                <div className={styles.options}>
                  {(['female', 'male'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`${styles.option} ${gender === g ? styles.optionActive : ''}`}
                      onClick={() => setGender(g)}
                    >
                      {g === 'female' ? 'Девочка' : 'Мальчик'}
                    </button>
                  ))}
                </div>
              </div>
              <LoadingButton loading={updateChild.isPending} onClick={saveChild}>
                Сохранить
              </LoadingButton>
            </>
          ) : (
            <>
              <div className={styles.infoCard}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Дата рождения</span>
                  <span>{child.birth_date}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Пол</span>
                  <span>{child.gender === 'female' ? 'женский' : 'мужской'}</span>
                </div>
              </div>
              <button type="button" className={styles.secondaryBtn} onClick={() => setEditing(true)}>
                Изменить
              </button>
            </>
          )}

          <section className={styles.section}>
            <div className={styles.sectionTitle}>Быстрые кнопки</div>
            {DEFAULT_QUICK_BUTTON_TYPES.map((type) => (
              <div key={type} className={styles.toggleRow}>
                <span className={styles.toggleLabel}>
                  <span>{eventIcon(type)}</span>
                  <span>{eventLabel(type)}</span>
                </span>
                <button
                  type="button"
                  className={`${styles.visBtn} ${hidden.has(type) ? styles.visHidden : styles.visShown}`}
                  onClick={() => toggleType(type)}
                >
                  {hidden.has(type) ? 'Скрыта' : 'Видна'}
                </button>
              </div>
            ))}
            <LoadingButton loading={updateQuickButtons.isPending} onClick={saveQuickButtons}>
              Сохранить кнопки
            </LoadingButton>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>Уведомления</div>
            <div className={styles.notifyCard}>
              <div className={styles.notifyStatus}>
                <span>Уведомления в Telegram</span>
                <span className={notifyEnabled ? styles.statusOn : styles.statusOff}>
                  {notifyEnabled ? 'Включены' : 'Выключены'}
                </span>
              </div>
              <p className={styles.hint}>
                Напишите <span className={styles.mono}>/notify</span> в чате с ботом, чтобы включить.{' '}
                <span className={styles.mono}>/notify_off</span> — отключить.
              </p>
              <div className={styles.thresholdBlock}>
                <div className={styles.thresholdTitle}>Пороги уведомлений (минуты)</div>
                {(
                  [
                    ['feeding_min', '🍼 Кормление'],
                    ['diaper_min', '🧷 Подгузник'],
                    ['wake_min', '👀 Бодрствование'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className={styles.thresholdRow}>
                    <span>{label}</span>
                    <input
                      className={styles.thresholdInput}
                      type="number"
                      value={thresholds[key]}
                      onChange={(e) => setThresholds((t) => ({ ...t, [key]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
              </div>
              <LoadingButton loading={updateSetting.isPending} onClick={saveThresholds}>
                Сохранить пороги
              </LoadingButton>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>Данные</div>
            <LoadingButton variant="ghost" loading={exporting} onClick={handleExport}>
              Экспорт в CSV
            </LoadingButton>
            <div className={styles.field}>
              <label className={styles.label}>Импорт CSV</label>
              <label className={styles.label} htmlFor="import-tz">
                Часовой пояс времени в файле
              </label>
              <select
                id="import-tz"
                className={styles.input}
                value={importTz}
                onChange={(e) => setImportTz(e.target.value)}
              >
                {IMPORT_TZ_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <input className={styles.input} type="file" accept=".csv" onChange={(e) => onImportFile(e.target.files?.[0])} />
              <div className={styles.hint}>Поддерживается файл .csv</div>
              {importUpload.isPending && <div className={styles.hint}>Импортируется…</div>}
            </div>
          </section>

          <LoadingButton
            variant="ghost"
            onClick={() => {
              clearToken();
              window.location.reload();
            }}
          >
            Выйти
          </LoadingButton>

          <div className={styles.version}>{APP_VERSION}</div>
        </div>
      )}
    </div>
  );
}
