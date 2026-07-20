export const KUNDE_ANREDE_VALUES = ['', 'Herr', 'Frau', 'Firma'];

export function normalizeKundeAnrede(value) {
  const trimmed = String(value || '').trim();
  return KUNDE_ANREDE_VALUES.includes(trimmed) ? trimmed : '';
}

export function formatKundeAnredeLabel(anrede) {
  const normalized = normalizeKundeAnrede(anrede);
  return normalized || '—';
}

export function formatKundeDisplayName(kunde) {
  const name = String(kunde?.name || '').trim();
  const anrede = normalizeKundeAnrede(kunde?.anrede);
  if (!anrede || anrede === 'Firma') return name;
  return name ? `${anrede} ${name}` : anrede;
}
