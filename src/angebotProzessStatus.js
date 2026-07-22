export const ANGEBOT_PROZESS_STATUS = {
  GESPEICHERT: 'gespeichert',
  VERSENDET: 'versendet',
  BESTAETIGT: 'bestaetigt',
  ABGELEHNT: 'abgelehnt',
};

export const ANGEBOT_PROZESS_STATUS_ORDER = [
  ANGEBOT_PROZESS_STATUS.GESPEICHERT,
  ANGEBOT_PROZESS_STATUS.VERSENDET,
  ANGEBOT_PROZESS_STATUS.BESTAETIGT,
  ANGEBOT_PROZESS_STATUS.ABGELEHNT,
];

const VALID = new Set(ANGEBOT_PROZESS_STATUS_ORDER);

export function normalizeAngebotProzessStatus(value) {
  const key = String(value || '').trim().toLowerCase();
  return VALID.has(key) ? key : ANGEBOT_PROZESS_STATUS.GESPEICHERT;
}

export function angebotProzessStatusLabelKey(status) {
  return `prozesse.status.${normalizeAngebotProzessStatus(status)}`;
}

export function angebotProzessStatusCssClass(status) {
  return `prozess-status--${normalizeAngebotProzessStatus(status)}`;
}
