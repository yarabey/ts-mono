import { useEffect, useState } from 'react';
import { clearToken, useImportUpload, useSetting, useUpdateSetting } from '@acme/baby-bot-data-access';
import { LoadingButton, useUiStore } from '@acme/baby-bot-ui';
import styles from './screens.module.css';

const DEFAULTS = { feeding_min: 180, diaper_min: 240, wake_min: 150 };

export function Profile() {
  const thresholds = useSetting('notify_thresholds');
  const updateSetting = useUpdateSetting();
  const importUpload = useImportUpload();
  const addToast = useUiStore((s) => s.addToast);
  const [values, setValues] = useState(DEFAULTS);

  useEffect(() => {
    if (thresholds.data?.value) {
      try {
        setValues({ ...DEFAULTS, ...(JSON.parse(thresholds.data.value) as Partial<typeof DEFAULTS>) });
      } catch {
        /* keep defaults */
      }
    }
  }, [thresholds.data]);

  const save = () =>
    updateSetting.mutate(
      { key: 'notify_thresholds', value: JSON.stringify(values) },
      { onSuccess: () => addToast('Сохранено', 'success') },
    );

  const onFile = (file: File | undefined) => {
    if (!file) return;
    importUpload.mutate(file, {
      onSuccess: () => addToast('Импорт выполнен', 'success'),
      onError: (e) => addToast((e as Error).message, 'error'),
    });
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Профиль</h1>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Пороги уведомлений (мин)</div>
        {(['feeding_min', 'diaper_min', 'wake_min'] as const).map((k) => (
          <div className={styles.field} key={k}>
            <label className={styles.label}>{k}</label>
            <input
              className={styles.input}
              type="number"
              value={values[k]}
              onChange={(e) => setValues((v) => ({ ...v, [k]: Number(e.target.value) }))}
            />
          </div>
        ))}
        <LoadingButton loading={updateSetting.isPending} onClick={save}>
          Сохранить пороги
        </LoadingButton>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Импорт</div>
        <input
          className={styles.input}
          type="file"
          accept=".csv,.realm"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {importUpload.isPending && <div className={styles.statLabel}>Импортируется…</div>}
      </section>

      <LoadingButton variant="ghost" onClick={() => { clearToken(); window.location.reload(); }}>
        Выйти
      </LoadingButton>
    </div>
  );
}
