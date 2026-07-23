import { t } from './i18n.js';

export const KUNDE_ANREDE_VALUES = ['Privatperson', 'Firma'];
export const KUNDE_ANREDE_DEFAULT = 'Privatperson';

export function normalizeKundeAnrede(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === 'Herr' || trimmed === 'Frau') return KUNDE_ANREDE_DEFAULT;
  if (trimmed === 'Firma') return 'Firma';
  if (trimmed === 'Privatperson') return 'Privatperson';
  return KUNDE_ANREDE_DEFAULT;
}

export function formatKundeAnredeLabel(anrede) {
  const normalized = normalizeKundeAnrede(anrede);
  if (normalized === 'Firma') return t('form.customerTypeCompany');
  return t('form.customerTypePrivate');
}

export function formatKundeDisplayName(kunde) {
  return String(kunde?.name || '').trim();
}
