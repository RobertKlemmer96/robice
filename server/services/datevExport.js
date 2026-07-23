import { formatKundeDisplayName } from '../../src/kundeStammdaten.js';

const MWST_SATZ = 0.19;

export const DATEV_SKR_PRESETS = {
  SKR04: {
    kontoForderungen: '1200',
    kontoErloese19: '4400',
  },
  SKR03: {
    kontoForderungen: '1400',
    kontoErloese19: '8400',
  },
};

export const DATEV_COLUMN_HEADER =
  'Umsatz (ohne Soll/Haben-Kz);Soll/Haben-Kennzeichen;WKZ Umsatz;Kurs;Basis-Umsatz;WKZ Basis-Umsatz;Konto;Gegenkonto (ohne BU-Schlüssel);BU-Schlüssel;Belegdatum;Belegfeld 1;Belegfeld 2;Skonto;Buchungstext;Postensperre;Diverse Adressnummer;Geschäftspartnerbank;Sachverhalt;Zinssperre;Beleglink;Beleginfo - Art 1;Beleginfo - Inhalt 1;Beleginfo - Art 2;Beleginfo - Inhalt 2;Beleginfo - Art 3;Beleginfo - Inhalt 3;Beleginfo - Art 4;Beleginfo - Inhalt 4;Beleginfo - Art 5;Beleginfo - Inhalt 5;Beleginfo - Art 6;Beleginfo - Inhalt 6;Beleginfo - Art 7;Beleginfo - Inhalt 7;Beleginfo - Art 8;Beleginfo - Inhalt 8;KOST1 - Kostenstelle;KOST2 - Kostenstelle;Kost-Menge;EU-Land u. UStID (Bestimmung);EU-Steuersatz (Bestimmung);Abw. Versteuerungsart;Sachverhalt L+L;Funktionsergänzung L+L;BU 49 Hauptfunktionstyp;BU 49 Hauptfunktionsnummer;BU 49 Funktionsergänzung;Zusatzinformation - Art 1;Zusatzinformation- Inhalt 1;Zusatzinformation - Art 2;Zusatzinformation- Inhalt 2;Zusatzinformation - Art 3;Zusatzinformation- Inhalt 3;Zusatzinformation - Art 4;Zusatzinformation- Inhalt 4;Zusatzinformation - Art 5;Zusatzinformation- Inhalt 5;Zusatzinformation - Art 6;Zusatzinformation- Inhalt 6;Zusatzinformation - Art 7;Zusatzinformation- Inhalt 7;Zusatzinformation - Art 8;Zusatzinformation- Inhalt 8;Zusatzinformation - Art 9;Zusatzinformation- Inhalt 9;Zusatzinformation - Art 10;Zusatzinformation- Inhalt 10;Zusatzinformation - Art 11;Zusatzinformation- Inhalt 11;Zusatzinformation - Art 12;Zusatzinformation- Inhalt 12;Zusatzinformation - Art 13;Zusatzinformation- Inhalt 13;Zusatzinformation - Art 14;Zusatzinformation- Inhalt 14;Zusatzinformation - Art 15;Zusatzinformation- Inhalt 15;Zusatzinformation - Art 16;Zusatzinformation- Inhalt 16;Zusatzinformation - Art 17;Zusatzinformation- Inhalt 17;Zusatzinformation - Art 18;Zusatzinformation- Inhalt 18;Zusatzinformation - Art 19;Zusatzinformation- Inhalt 19;Zusatzinformation - Art 20;Zusatzinformation- Inhalt 20;Stück;Gewicht;Zahlweise;Forderungsart;Veranlagungsjahr;Zugeordnete Fälligkeit;Skontotyp;Auftragsnummer;Buchungstyp;USt-Schlüssel (Anzahlungen);EU-Land (Anzahlungen);Sachverhalt L+L (Anzahlungen);EU-Steuersatz (Anzahlungen);Erlöskonto (Anzahlungen);Herkunft-Kz;Buchungs GUID;KOST-Datum;SEPA-Mandatsreferenz;Skontosperre;Gesellschaftername;Beteiligtennummer;Identifikationsnummer;Zeichnernummer;Postensperre bis;Bezeichnung SoBil-Sachverhalt;Kennzeichen SoBil-Buchung;Festschreibung;Leistungsdatum;Datum Zuord. Steuerperiode;Fälligkeit;Generalumkehr (GU);Steuersatz;Land;Abrechnungsreferenz;BVV-Position;EU-Land u. UStID (Ursprung);EU-Steuersatz (Ursprung);Abw. Skontokonto';

const COLUMN_COUNT = DATEV_COLUMN_HEADER.split(';').length;

export function normalizeDatevSettings(raw = {}) {
  const skr = raw.skr === 'SKR03' ? 'SKR03' : 'SKR04';
  const preset = DATEV_SKR_PRESETS[skr];
  const kontenlaenge = Number.parseInt(raw.kontenlaenge, 10);
  const wjBeginn = String(raw.wjBeginn || '').replace(/\D/g, '').slice(0, 8);

  return {
    beraterNr: String(raw.beraterNr || '').trim(),
    mandantenNr: String(raw.mandantenNr || '').trim(),
    skr,
    kontenlaenge: [4, 5, 6, 8].includes(kontenlaenge) ? kontenlaenge : 4,
    wjBeginn: wjBeginn || `${new Date().getFullYear()}0101`,
    kontoForderungen: String(raw.kontoForderungen || preset.kontoForderungen).replace(/\D/g, ''),
    kontoErloese19: String(raw.kontoErloese19 || preset.kontoErloese19).replace(/\D/g, ''),
    buSchluessel19: String(raw.buSchluessel19 || '3').trim() || '3',
  };
}

export function validateDatevSettings(datev) {
  const settings = normalizeDatevSettings(datev);
  const errors = [];

  if (!settings.beraterNr) errors.push('Beraternummer fehlt.');
  else if (!/^\d+$/.test(settings.beraterNr)) errors.push('Beraternummer muss numerisch sein.');
  if (!settings.mandantenNr) errors.push('Mandantennummer fehlt.');
  else if (!/^\d+$/.test(settings.mandantenNr)) errors.push('Mandantennummer muss numerisch sein.');
  if (!settings.kontoForderungen) errors.push('Forderungskonto fehlt.');
  if (!settings.kontoErloese19) errors.push('Erlöskonto (19 %) fehlt.');
  if (!/^\d{8}$/.test(settings.wjBeginn)) errors.push('Wirtschaftsjahresbeginn ist ungültig (YYYYMMDD).');

  if (errors.length) {
    const err = new Error(errors.join(' '));
    err.status = 400;
    throw err;
  }

  return settings;
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function berechneSummenAusPosten(posten) {
  const netto = (posten || []).reduce(
    (sum, p) => sum + Number(p.preis || 0) * Number(p.menge || 0),
    0
  );
  const mwst = roundMoney(netto * MWST_SATZ);
  return { netto: roundMoney(netto), mwst, brutto: roundMoney(netto + mwst) };
}

function resolvePostenDetails(posten) {
  return (posten || []).map((item) => ({
    bezeichnung: String(item.bezeichnung || '').trim(),
    menge: Number(item.menge) || 0,
    preis: Number(item.preis) || 0,
  }));
}

function parseIsoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function toDdMm(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}${m}`;
}

export function getRechnungBookingDate(rechnung) {
  return (
    parseIsoDate(rechnung.rechnungsdatum) ||
    parseIsoDate(rechnung.erstelltAm) ||
    new Date()
  );
}

export function filterRechnungenByPeriod(rechnungen, von, bis) {
  const start = parseIsoDate(von);
  const end = parseIsoDate(bis);
  if (!start || !end) {
    const err = new Error('Ungültiger Zeitraum (von/bis).');
    err.status = 400;
    throw err;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (start > end) {
    const err = new Error('Das Startdatum darf nicht nach dem Enddatum liegen.');
    err.status = 400;
    throw err;
  }

  return (rechnungen || [])
    .filter((rechnung) => {
      const bookingDate = getRechnungBookingDate(rechnung);
      return bookingDate >= start && bookingDate <= end;
    })
    .sort((a, b) => getRechnungBookingDate(a) - getRechnungBookingDate(b));
}

export function formatDatevAmount(amount) {
  return roundMoney(Number(amount) || 0)
    .toFixed(2)
    .replace('.', ',');
}

export function padKonto(konto, laenge) {
  const digits = String(konto || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(laenge, '0').slice(-laenge);
}

export function escapeExtfField(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/"/g, '""')
    .trim();
}

function q(value) {
  if (value === '' || value === null || value === undefined) return '""';
  return `"${escapeExtfField(value)}"`;
}

function buildTimestamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${y}${m}${d}${h}${min}${s}${ms}`;
}

export function buildExtfHeader(datev, von, bis) {
  const settings = normalizeDatevSettings(datev);
  const vonDate = parseIsoDate(von);
  const bisDate = parseIsoDate(bis);
  const periodFrom = toYmd(vonDate);
  const periodTo = toYmd(bisDate);

  const fields = [
    q('EXTF'),
    '700',
    '21',
    q('Buchungsstapel'),
    '13',
    buildTimestamp(),
    '""',
    q('RE'),
    '""',
    '""',
    settings.beraterNr,
    settings.mandantenNr,
    settings.wjBeginn,
    String(settings.kontenlaenge),
    periodFrom,
    periodTo,
    q('Buchungsstapel'),
    q('WD'),
    '1',
    '0',
    '0',
    q('EUR'),
    '""',
    '""',
    '""',
    '""',
    q('03'),
    '""',
    '""',
    '""',
    '""',
  ];

  return fields.join(';');
}

function buildBuchungstext(rechnung) {
  const kundeName = formatKundeDisplayName(rechnung.kunde) || rechnung.kunde?.name || 'Kunde';
  const text = `${rechnung.rechnungNr || 'Rechnung'} ${kundeName}`.trim();
  return text.slice(0, 60);
}

export function buildBuchungszeile(rechnung, datev) {
  const settings = normalizeDatevSettings(datev);
  const posten = resolvePostenDetails(rechnung.posten);
  const { brutto } = berechneSummenAusPosten(posten);
  const bookingDate = getRechnungBookingDate(rechnung);

  const row = Array(COLUMN_COUNT).fill('""');
  row[0] = formatDatevAmount(brutto);
  row[1] = q('S');
  row[6] = q(padKonto(settings.kontoForderungen, settings.kontenlaenge));
  row[7] = q(padKonto(settings.kontoErloese19, settings.kontenlaenge));
  row[8] = q(settings.buSchluessel19);
  row[9] = q(toDdMm(bookingDate));
  row[10] = q(rechnung.rechnungNr || '');
  row[13] = q(buildBuchungstext(rechnung));

  return row.join(';');
}

export function buildDatevCsv(rechnungen, datev, { von, bis }) {
  const settings = validateDatevSettings(datev);
  const filtered = filterRechnungenByPeriod(rechnungen, von, bis);

  if (!filtered.length) {
    const err = new Error('Keine Rechnungen im gewählten Zeitraum.');
    err.status = 400;
    throw err;
  }

  const lines = [
    buildExtfHeader(settings, von, bis),
    DATEV_COLUMN_HEADER,
    ...filtered.map((rechnung) => buildBuchungszeile(rechnung, settings)),
  ];

  const csv = `${lines.join('\r\n')}\r\n`;
  const buffer = Buffer.from(csv, 'latin1');
  return { buffer, count: filtered.length, settings };
}
