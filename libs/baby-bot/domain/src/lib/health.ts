import type { HealthType } from './enums.js';

/** One selectable preset within a health sub-type catalog. */
export interface HealthCatalogItem {
  id: string;
  name_ru: string;
}

/**
 * Catalog of preset options for the catalog-driven health sub-types, ported
 * verbatim from `baby-ai`'s `utils/health-catalog.ts`. The Add/Edit Event form
 * renders these as quick-pick buttons plus a free-text "свой вариант" field,
 * and the summary formatter reuses the labels.
 *
 * `temperature` carries a numeric value (no catalog); `illness` uses its list
 * as quick-fill suggestions for the free-text description field.
 */
export const HEALTH_CATALOG: Record<string, HealthCatalogItem[]> = {
  vaccination: [
    { id: 'vac_hepb', name_ru: 'Гепатит B' },
    { id: 'vac_dtap', name_ru: 'АКДС' },
    { id: 'vac_ipv', name_ru: 'Полиомиелит' },
    { id: 'vac_hib', name_ru: 'ХИБ' },
    { id: 'vac_pcv', name_ru: 'Пневмококк' },
    { id: 'vac_rotavirus', name_ru: 'Ротавирус' },
    { id: 'vac_mmr', name_ru: 'Корь, краснуха, паротит' },
    { id: 'vac_varicella', name_ru: 'Ветрянка' },
    { id: 'vac_hepa', name_ru: 'Гепатит A' },
    { id: 'vac_bcg', name_ru: 'БЦЖ' },
    { id: 'vac_flu', name_ru: 'Грипп' },
  ],
  doctor: [
    { id: 'doctor_pediatrician', name_ru: 'Педиатр' },
    { id: 'doctor_neurologist', name_ru: 'Невролог' },
    { id: 'doctor_surgeon', name_ru: 'Хирург' },
    { id: 'doctor_orthopedist', name_ru: 'Ортопед' },
    { id: 'doctor_ophthalmologist', name_ru: 'Офтальмолог' },
    { id: 'doctor_ent', name_ru: 'ЛОР' },
    { id: 'doctor_dentist', name_ru: 'Стоматолог' },
    { id: 'doctor_allergist', name_ru: 'Аллерголог' },
    { id: 'doctor_cardiologist', name_ru: 'Кардиолог' },
    { id: 'doctor_gastroenterologist', name_ru: 'Гастроэнтеролог' },
  ],
  medication: [
    { id: 'med_antifever', name_ru: 'Жаропонижающее' },
    { id: 'med_antibiotics', name_ru: 'Антибиотик' },
    { id: 'med_antiviral', name_ru: 'Противовирусное' },
    { id: 'med_probiotics', name_ru: 'Пробиотики' },
    { id: 'med_vitamins', name_ru: 'Витамины' },
    { id: 'med_antihistamine', name_ru: 'Антигистаминное' },
    { id: 'med_drops_eye', name_ru: 'Глазные капли' },
    { id: 'med_drops_nose', name_ru: 'Капли в нос' },
    { id: 'med_ointment', name_ru: 'Мазь' },
    { id: 'med_sorbents', name_ru: 'Сорбенты' },
  ],
  illness: [
    { id: 'ill_cold', name_ru: 'Простуда' },
    { id: 'ill_flu', name_ru: 'Грипп' },
    { id: 'ill_cough', name_ru: 'Кашель' },
    { id: 'ill_fever', name_ru: 'Температура' },
    { id: 'ill_runny_nose', name_ru: 'Насморк' },
    { id: 'ill_diarrhea', name_ru: 'Диарея' },
    { id: 'ill_constipation', name_ru: 'Запор' },
    { id: 'ill_vomiting', name_ru: 'Рвота' },
    { id: 'ill_rash', name_ru: 'Сыпь' },
    { id: 'ill_allergy', name_ru: 'Аллергия' },
    { id: 'ill_teething', name_ru: 'Прорезывание зубов' },
    { id: 'ill_ear', name_ru: 'Ухо' },
    { id: 'ill_eye', name_ru: 'Глаза' },
    { id: 'ill_colic', name_ru: 'Колики' },
  ],
};

/** Russian labels for the five health sub-types (Add/Edit form type picker). */
export const HEALTH_TYPE_LABELS: Record<HealthType, string> = {
  temperature: 'Температура',
  vaccination: 'Прививка',
  doctor: 'Врач',
  medication: 'Лекарство',
  illness: 'Болезнь',
};
