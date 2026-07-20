export const FIRMA = {
  name: 'Ihr Unternehmen GmbH',
  strasse: 'Musterstraße 1',
  plzOrt: '12345 Musterstadt',
  telefon: '+49 123 456789',
  email: 'info@ihr-unternehmen.de',
  web: 'www.ihr-unternehmen.de',
  ustId: 'DE123456789',
};

export const EINHEITEN = ['Stk.', 'Std.'];

export const POSTEN_ART_LABELS = {
  lohn: 'Lohn',
  material: 'Material',
};

export const DEFAULT_POSTEN_ART = 'lohn';

export function normalizePostenArt(art) {
  return String(art || '').trim().toLowerCase() === 'material' ? 'material' : 'lohn';
}

export function formatPostenArt(art) {
  return POSTEN_ART_LABELS[normalizePostenArt(art)];
}

export const POSTEN = [
  {
    id: 'beratung',
    bezeichnung: 'Beratung vor Ort',
    beschreibung: 'Technische Beratung und Bedarfsanalyse',
    preisStk: 95,
    preisStd: 95,
  },
  {
    id: 'montage',
    bezeichnung: 'Montagearbeiten',
    beschreibung: 'Fachgerechte Montage inkl. Material',
    preisStk: 75,
    preisStd: 75,
  },
  {
    id: 'wartung',
    bezeichnung: 'Wartungspaket Standard',
    beschreibung: 'Jährliche Inspektion und Funktionsprüfung',
    preisStk: 280,
    preisStd: 280,
  },
  {
    id: 'reparatur',
    bezeichnung: 'Reparatur klein',
    beschreibung: 'Kleinreparaturen bis 2 Stunden',
    preisStk: 120,
    preisStd: 120,
  },
  {
    id: 'reparatur-gross',
    bezeichnung: 'Reparatur groß',
    beschreibung: 'Umfangreiche Reparaturarbeiten',
    preisStk: 85,
    preisStd: 85,
  },
  {
    id: 'material',
    bezeichnung: 'Ersatzteile / Material',
    beschreibung: 'Material nach Aufwand',
    preisStk: 45,
    preisStd: 75,
    art: 'material',
  },
  {
    id: 'anfahrt',
    bezeichnung: 'Anfahrt',
    beschreibung: 'Anfahrtspauschale im Umkreis 30 km',
    preisStk: 35,
    preisStd: 35,
  },
  {
    id: 'notdienst',
    bezeichnung: 'Notdienst',
    beschreibung: 'Einsatz außerhalb der Geschäftszeiten',
    preisStk: 150,
    preisStd: 150,
  },
  {
    id: 'schulung',
    bezeichnung: 'Einweisung / Schulung',
    beschreibung: 'Bedienerschulung vor Ort',
    preisStk: 90,
    preisStd: 90,
  },
  {
    id: 'dokumentation',
    bezeichnung: 'Dokumentation',
    beschreibung: 'Erstellung technischer Dokumentation',
    preisStk: 180,
    preisStd: 180,
  },
];

export function getDefaultEinheit(posten) {
  if (!posten) return 'Std.';
  const preisStk = Number(posten.preisStk) || 0;
  const preisStd = Number(posten.preisStd) || 0;
  if (preisStk > preisStd) return 'Stk.';
  if (preisStd > preisStk) return 'Std.';
  return 'Std.';
}

export function getPostenPreis(posten, einheit) {
  if (einheit === 'Stk.') return posten.preisStk ?? posten.preisStd;
  return posten.preisStd ?? posten.preisStk;
}
