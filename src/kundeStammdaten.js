import { t } from './i18n.js';

export const KUNDE_ANREDE_VALUES = ['', 'Herr', 'Frau', 'Firma'];

export function normalizeKundeAnrede(value) {
  const trimmed = String(value || '').trim();
  return KUNDE_ANREDE_VALUES.includes(trimmed) ? trimmed : '';
}

export function formatKundeAnredeLabel(anrede) {
  const normalized = normalizeKundeAnrede(anrede);
  if (!normalized) return '—';
  if (normalized === 'Herr') return t('form.salutationMr');
  if (normalized === 'Frau') return t('form.salutationMs');
  if (normalized === 'Firma') return t('form.salutationCompany');
  return normalized;
}

export function formatKundeDisplayName(kunde) {
  const name = String(kunde?.name || '').trim();
  const anrede = normalizeKundeAnrede(kunde?.anrede);
  if (!anrede || anrede === 'Firma') return name;
  const label = formatKundeAnredeLabel(anrede);
  if (label === '—') return name;
  return name ? `${label} ${name}` : label;
}
