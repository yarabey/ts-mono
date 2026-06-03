import { useState } from 'react';
import type { CreateEventPayload } from '@acme/baby-bot-domain';
import { BottomSheet } from './BottomSheet.js';
import { LoadingButton } from './LoadingButton.js';
import { notificationError, notificationSuccess } from './haptics.js';
import sheet from './QuickSheet.module.css';

const DIAPER_TYPES = [
  { value: 'wet', label: 'Мокрый 💧' },
  { value: 'dirty', label: 'Грязный 💩' },
  { value: 'mixed', label: 'Смешанный' },
];

export interface QuickDiaperSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: CreateEventPayload) => Promise<void>;
}

export function QuickDiaperSheet({ open, onClose, onSave }: QuickDiaperSheetProps) {
  const [diaperType, setDiaperType] = useState('wet');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ event_type: 'diaper', details: { diaper_type: diaperType } });
      notificationSuccess();
      onClose();
    } catch {
      notificationError();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Подгузник">
      <div className={sheet.group}>
        <div className={sheet.label}>Тип</div>
        <div className={sheet.options}>
          {DIAPER_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setDiaperType(t.value)}
              className={`${sheet.option} ${diaperType === t.value ? sheet.active : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <LoadingButton onClick={handleSave} loading={saving} className={sheet.save}>
        Сохранить
      </LoadingButton>
    </BottomSheet>
  );
}
