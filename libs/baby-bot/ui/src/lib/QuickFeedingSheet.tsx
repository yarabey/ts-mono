import { useState } from 'react';
import type { CreateEventPayload } from '@acme/baby-bot-domain';
import { BottomSheet } from './BottomSheet.js';
import { LoadingButton } from './LoadingButton.js';
import { notificationError, notificationSuccess } from './haptics.js';
import sheet from './QuickSheet.module.css';

const FEEDING_TYPES = [
  { value: 'breast', label: 'Грудь' },
  { value: 'bottle', label: 'Бутылочка' },
  { value: 'solid', label: 'Прикорм' },
  { value: 'water', label: 'Вода' },
];

const BREAST_SIDES = [
  { value: 'left', label: 'Левая' },
  { value: 'right', label: 'Правая' },
  { value: 'both', label: 'Обе' },
];

export interface QuickFeedingSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: CreateEventPayload) => Promise<void>;
}

export function QuickFeedingSheet({ open, onClose, onSave }: QuickFeedingSheetProps) {
  const [feedingType, setFeedingType] = useState('breast');
  const [breastSide, setBreastSide] = useState('left');
  const [amountMl, setAmountMl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const details: Record<string, unknown> = { feeding_type: feedingType };
      if (feedingType === 'breast') details.breast_side = breastSide;
      if (feedingType === 'bottle' && amountMl) details.amount_ml = parseInt(amountMl, 10);
      if (feedingType === 'solid') details.food_name = '';
      await onSave({ event_type: 'feeding', details });
      notificationSuccess();
      setAmountMl('');
      onClose();
    } catch {
      notificationError();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Кормление">
      <div className={sheet.group}>
        <div className={sheet.label}>Тип</div>
        <div className={sheet.options}>
          {FEEDING_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setFeedingType(t.value)}
              className={`${sheet.option} ${feedingType === t.value ? sheet.active : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {feedingType === 'breast' && (
        <div className={sheet.group}>
          <div className={sheet.label}>Сторона</div>
          <div className={sheet.options}>
            {BREAST_SIDES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setBreastSide(s.value)}
                className={`${sheet.option} ${breastSide === s.value ? sheet.active : ''}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {feedingType === 'bottle' && (
        <div className={sheet.group}>
          <div className={sheet.label}>Объём (мл)</div>
          <input
            type="number"
            inputMode="numeric"
            value={amountMl}
            onChange={(e) => setAmountMl(e.target.value)}
            placeholder="0"
            className={sheet.input}
          />
        </div>
      )}

      <LoadingButton onClick={handleSave} loading={saving} className={sheet.save}>
        Сохранить
      </LoadingButton>
    </BottomSheet>
  );
}
