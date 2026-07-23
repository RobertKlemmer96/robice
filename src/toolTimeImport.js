import { normalizeAdresse } from './adresse.js';
import { normalizeKundeAnrede } from './kundeStammdaten.js';
import { normalizeAngebotProzessStatus } from './angebotProzessStatus.js';
import { addDaysIso, getZahlungszielTage } from './dokumentnummer.js';

const COMPARE_FIELDS = ['name', 'anrede', 'strasse', 'plzOrt', 'telefon', 'email'];

function normalizeCompare(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeKundeForCompare(kunde) {
  const adresse = normalizeAdresse(kunde);
  return {
    name: normalizeCompare(kunde.name),
    anrede: normalizeCompare(normalizeKundeAnrede(kunde.anrede)),
    strasse: normalizeCompare(adresse.strasse),
    plzOrt: normalizeCompare(adresse.plzOrt),
    telefon: normalizeCompare(kunde.telefon),
    email: normalizeCompare(kunde.email),
  };
}

function hasAddress(kunde) {
  return Boolean(kunde.strasse || kunde.plzOrt);
}

function addressesMatch(a, b) {
  return hasAddress(a) && hasAddress(b) && a.strasse === b.strasse && a.plzOrt === b.plzOrt;
}

function countMatchingFields(a, b) {
  let comparable = 0;
  let matched = 0;
  for (const field of COMPARE_FIELDS) {
    const av = a[field];
    const bv = b[field];
    if (!av || !bv) continue;
    comparable += 1;
    if (av === bv) matched += 1;
  }
  return { comparable, matched };
}

export function isDuplicateKunde(candidate, existing) {
  const a = normalizeKundeForCompare(candidate);
  const b = normalizeKundeForCompare(existing);

  if (!a.name && !b.name) return true;

  const emailMatch = Boolean(a.email) && a.email === b.email;
  if (emailMatch) return true;

  if (addressesMatch(a, b) && a.name === b.name) return true;

  if (addressesMatch(a, b) && (a.telefon === b.telefon || emailMatch)) return true;

  const { comparable, matched } = countMatchingFields(a, b);
  if (comparable >= 4 && matched >= 4) return true;
  if (comparable >= 3 && matched === comparable) return true;

  return false;
}

function findDuplicateKunde(candidate, existingKunden) {
  return existingKunden.find((existing) => isDuplicateKunde(candidate, existing)) ?? null;
}

const TOOL_TIME_HEADERS = {
  kundennummer: 'Kundennummer',
  kundeTyp: 'Kunde Typ',
  firma: 'Firma',
  anrede: 'Anrede',
  vorname: 'Vorname',
  nachname: 'Nachname',
  adresse: 'Adresse',
  adresszusatz: 'Adresszusatz',
  plz: 'PLZ',
  stadt: 'Stadt',
  festnetz: 'Festnetz',
  mobil: 'Mobiltelefon',
  email: 'E-Mail',
  beschreibung: 'Beschreibung',
};

function cleanCell(value) {
  return String(value ?? '').trim();
}

function joinName(parts) {
  return parts.map((part) => cleanCell(part)).filter(Boolean).join(' ').trim();
}

export function parseSemicolonCsv(text) {
  const normalized = String(text || '').replace(/^\uFEFF/, '');
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(';');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cleanCell(values[index]);
    });
    return row;
  });
}

function buildStrasse(adresse, adresszusatz) {
  const parts = [cleanCell(adresse), cleanCell(adresszusatz)].filter(Boolean);
  return parts.join(', ');
}

function buildPlzOrt(plz, stadt) {
  return joinName([plz, stadt]);
}

function resolveAnrede(row) {
  const typ = cleanCell(row[TOOL_TIME_HEADERS.kundeTyp]).toUpperCase();
  if (typ === 'UNTERNEHMEN') return 'Firma';
  return 'Privatperson';
}

function resolveName(row) {
  const typ = cleanCell(row[TOOL_TIME_HEADERS.kundeTyp]).toUpperCase();
  const firma = cleanCell(row[TOOL_TIME_HEADERS.firma]);
  const person = joinName([row[TOOL_TIME_HEADERS.vorname], row[TOOL_TIME_HEADERS.nachname]]);

  if (typ === 'UNTERNEHMEN') {
    return firma || person;
  }

  return person || firma;
}

export function mapToolTimeRowToKunde(row) {
  const name = resolveName(row);
  if (!name) return null;

  const adresse = normalizeAdresse({
    strasse: buildStrasse(row[TOOL_TIME_HEADERS.adresse], row[TOOL_TIME_HEADERS.adresszusatz]),
    plzOrt: buildPlzOrt(row[TOOL_TIME_HEADERS.plz], row[TOOL_TIME_HEADERS.stadt]),
  });

  const telefon =
    cleanCell(row[TOOL_TIME_HEADERS.festnetz]) || cleanCell(row[TOOL_TIME_HEADERS.mobil]);

  return {
    anrede: resolveAnrede(row),
    name,
    strasse: adresse.strasse,
    plzOrt: adresse.plzOrt,
    adresse: adresse.adresse,
    telefon,
    email: cleanCell(row[TOOL_TIME_HEADERS.email]),
    notiz: cleanCell(row[TOOL_TIME_HEADERS.beschreibung]),
  };
}

export function parseToolTimeCustomers(csvText) {
  return parseSemicolonCsv(csvText)
    .map(mapToolTimeRowToKunde)
    .filter(Boolean);
}

const TOOL_TIME_OFFER_HEADERS = {
  nummer: 'nummer',
  datum: 'datum',
  titel: 'titel',
  kundeTyp: 'kunde_typ',
  kundeVorname: 'kunde_vorname',
  kundeNachname: 'kunde_nachname',
  kundeFirma: 'kunde_firma',
  kundeAdresse1: 'kunde_adresse_1',
  kundeAdresse2: 'kunde_adresse_2',
  kundePlz: 'kunde_plz',
  kundeOrt: 'kunde_ort',
  kundeEmail: 'kunde_email_adresse',
  betragNetto: 'betrag_netto',
  betragBrutto: 'betrag_brutto',
  ustSatz: 'ust_satz',
  status: 'status',
};

export const TOOL_TIME_MARKER_PREFIX = 'Tool Time: ';

/** @deprecated Use TOOL_TIME_MARKER_PREFIX */
export const TOOL_TIME_OFFER_MARKER_PREFIX = TOOL_TIME_MARKER_PREFIX;

export function parseGermanDecimal(value) {
  const normalized = cleanCell(value).replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseGermanDate(value) {
  const raw = cleanCell(value);
  const match = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return '';
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function detectToolTimeCsvType(csvText) {
  const normalized = String(csvText || '').replace(/^\uFEFF/, '');
  const firstLine = normalized.split(/\r?\n/).find((line) => line.trim()) || '';
  const headers = firstLine.split(';').map((header) => header.trim().toLowerCase());
  if (
    headers.includes('angebot_nummer') ||
    headers.includes('leistungszeitraum_von') ||
    headers.includes('ausstehender_betrag')
  ) {
    return 'rechnungen';
  }
  if (headers.includes('kunde_email_adresse') && headers.includes('betrag_netto')) {
    return 'angebote';
  }
  if (headers.includes('kundennummer') || headers.includes('kunde typ')) return 'customers';
  return null;
}

function resolveDocumentAnrede(row, headers) {
  const typ = cleanCell(row[headers.kundeTyp]).toUpperCase();
  if (typ === 'UNTERNEHMEN') return 'Firma';
  return 'Privatperson';
}

function resolveDocumentName(row, headers) {
  const typ = cleanCell(row[headers.kundeTyp]).toUpperCase();
  const firma = cleanCell(row[headers.kundeFirma]);
  const person = joinName([row[headers.kundeVorname], row[headers.kundeNachname]]);

  if (typ === 'UNTERNEHMEN') {
    return firma || person;
  }

  return person || firma;
}

function mapToolTimeDocumentRowToKunde(row, headers) {
  const name = resolveDocumentName(row, headers);
  if (!name) return null;

  const adresse = normalizeAdresse({
    strasse: buildStrasse(row[headers.kundeAdresse1], row[headers.kundeAdresse2]),
    plzOrt: buildPlzOrt(row[headers.kundePlz], row[headers.kundeOrt]),
  });

  const email = headers.kundeEmail ? cleanCell(row[headers.kundeEmail]) : '';

  return {
    anrede: resolveDocumentAnrede(row, headers),
    name,
    strasse: adresse.strasse,
    plzOrt: adresse.plzOrt,
    adresse: adresse.adresse,
    telefon: '',
    email,
    notiz: '',
  };
}

function mapToolTimeOfferStatus(status) {
  const key = cleanCell(status).toLowerCase();
  if (key.includes('angenommen') || key.includes('bestätigt') || key.includes('bestaetigt')) {
    return 'bestaetigt';
  }
  if (key.includes('abgelehnt')) return 'abgelehnt';
  if (key.includes('versendet')) return 'versendet';
  return 'gespeichert';
}

export function mapToolTimeOfferRowToKunde(row) {
  return mapToolTimeDocumentRowToKunde(row, TOOL_TIME_OFFER_HEADERS);
}

export function mapToolTimeRowToAngebot(row) {
  const toolTimeNr = cleanCell(row[TOOL_TIME_OFFER_HEADERS.nummer]);
  const angebotsdatum = parseGermanDate(row[TOOL_TIME_OFFER_HEADERS.datum]);
  const kunde = mapToolTimeOfferRowToKunde(row);
  if (!toolTimeNr || !angebotsdatum || !kunde) return null;

  return {
    toolTimeNr,
    titel: cleanCell(row[TOOL_TIME_OFFER_HEADERS.titel]) || 'Angebot',
    angebotsdatum,
    prozessStatus: normalizeAngebotProzessStatus(mapToolTimeOfferStatus(row[TOOL_TIME_OFFER_HEADERS.status])),
    netto: parseGermanDecimal(row[TOOL_TIME_OFFER_HEADERS.betragNetto]),
    brutto: parseGermanDecimal(row[TOOL_TIME_OFFER_HEADERS.betragBrutto]),
    ustSatz: parseGermanDecimal(row[TOOL_TIME_OFFER_HEADERS.ustSatz]),
    kunde,
  };
}

export function parseToolTimeOffers(csvText) {
  return parseSemicolonCsv(csvText)
    .map(mapToolTimeRowToAngebot)
    .filter(Boolean);
}

function createImportPostenId() {
  return `frei_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const TOOL_TIME_INVOICE_HEADERS = {
  nummer: 'nummer',
  datum: 'datum',
  titel: 'titel',
  kundeTyp: 'kunde_typ',
  kundeVorname: 'kunde_vorname',
  kundeNachname: 'kunde_nachname',
  kundeFirma: 'kunde_firma',
  kundeAdresse1: 'kunde_adresse_1',
  kundeAdresse2: 'kunde_adresse_2',
  kundePlz: 'kunde_plz',
  kundeOrt: 'kunde_ort',
  angebotNummer: 'angebot_nummer',
  leistungszeitraumVon: 'leistungszeitraum_von',
  leistungszeitraumBis: 'leistungszeitraum_bis',
  betragNetto: 'betrag_netto',
  betragBrutto: 'betrag_brutto',
  ustSatz: 'ust_satz',
  status: 'status',
  stornoNummer: 'storno_rechnung_nummer',
};

function formatIsoToGermanDate(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return '';
  return `${day}.${month}.${year}`;
}

function buildToolTimeMarker(toolTimeNr) {
  return `${TOOL_TIME_MARKER_PREFIX}${toolTimeNr}`;
}

function buildRechnungBeschreibung(invoice) {
  const parts = [];
  if (invoice.leistungszeitraumVon && invoice.leistungszeitraumBis) {
    parts.push(
      `Leistungszeitraum: ${formatIsoToGermanDate(invoice.leistungszeitraumVon)} – ${formatIsoToGermanDate(invoice.leistungszeitraumBis)}`
    );
  }
  if (invoice.angebotNummer) {
    parts.push(`Angebot Tool Time: ${invoice.angebotNummer}`);
  }
  if (invoice.stornoNummer) {
    parts.push(`Storno: ${invoice.stornoNummer}`);
  }

  const marker = buildToolTimeMarker(invoice.toolTimeNr);
  if (!parts.length) return marker;
  return `${marker} (${parts.join('; ')})`;
}

export function mapToolTimeRowToRechnung(row) {
  const toolTimeNr = cleanCell(row[TOOL_TIME_INVOICE_HEADERS.nummer]);
  const rechnungsdatum = parseGermanDate(row[TOOL_TIME_INVOICE_HEADERS.datum]);
  const kunde = mapToolTimeDocumentRowToKunde(row, TOOL_TIME_INVOICE_HEADERS);
  if (!toolTimeNr || !rechnungsdatum || !kunde) return null;

  return {
    toolTimeNr,
    titel: cleanCell(row[TOOL_TIME_INVOICE_HEADERS.titel]) || 'Rechnung',
    rechnungsdatum,
    leistungszeitraumVon: parseGermanDate(row[TOOL_TIME_INVOICE_HEADERS.leistungszeitraumVon]),
    leistungszeitraumBis: parseGermanDate(row[TOOL_TIME_INVOICE_HEADERS.leistungszeitraumBis]),
    angebotNummer: cleanCell(row[TOOL_TIME_INVOICE_HEADERS.angebotNummer]),
    stornoNummer: cleanCell(row[TOOL_TIME_INVOICE_HEADERS.stornoNummer]),
    netto: parseGermanDecimal(row[TOOL_TIME_INVOICE_HEADERS.betragNetto]),
    brutto: parseGermanDecimal(row[TOOL_TIME_INVOICE_HEADERS.betragBrutto]),
    ustSatz: parseGermanDecimal(row[TOOL_TIME_INVOICE_HEADERS.ustSatz]),
    kunde,
  };
}

export function parseToolTimeRechnungen(csvText) {
  return parseSemicolonCsv(csvText)
    .map(mapToolTimeRowToRechnung)
    .filter(Boolean);
}

export function isDuplicateRechnung(candidate, existingRechnungen) {
  const marker = buildToolTimeMarker(candidate.toolTimeNr);
  return existingRechnungen.some((rechnung) =>
    (rechnung.posten || []).some((posten) => String(posten.beschreibung || '').includes(marker))
  );
}

function buildKundeSnapshot(kunde) {
  return {
    name: kunde.name,
    strasse: kunde.strasse,
    plzOrt: kunde.plzOrt,
    adresse: kunde.adresse,
    email: kunde.email || undefined,
    telefon: kunde.telefon || undefined,
    anrede: kunde.anrede || undefined,
    kundenNr: kunde.kundenNr || undefined,
  };
}

export async function importToolTimeRechnungen(csvText, {
  saveRechnung,
  saveKunde,
  getAllRechnungen,
  getAllKunden,
  generiereRechnungsnummer,
  generiereKundennummer,
  createRechnungId,
  createKundeId,
}) {
  const rows = parseSemicolonCsv(csvText);
  const invoices = rows.map(mapToolTimeRowToRechnung).filter(Boolean);
  const existingRechnungen = await getAllRechnungen();
  const existingKunden = await getAllKunden();
  const importedKunden = [];
  const importedRechnungen = [];

  const result = {
    total: invoices.length,
    imported: 0,
    skipped: rows.length - invoices.length,
    duplicates: 0,
    customersCreated: 0,
    errors: [],
  };

  for (const invoice of invoices) {
    if (isDuplicateRechnung(invoice, [...existingRechnungen, ...importedRechnungen])) {
      result.duplicates += 1;
      result.skipped += 1;
      continue;
    }

    try {
      const { kunde, created } = await resolveKundeForOffer(invoice.kunde, {
        existingKunden,
        importedKunden,
        saveKunde,
        generiereKundennummer,
        getAllKunden,
        createKundeId,
      });
      if (created) result.customersCreated += 1;

      const jetzt = new Date().toISOString();
      const rechnungNr = await generiereRechnungsnummer();
      const saved = {
        id: createRechnungId(),
        rechnungNr,
        erstelltAm: jetzt,
        aktualisiertAm: jetzt,
        rechnungsdatum: invoice.rechnungsdatum,
        faelligAm: addDaysIso(invoice.rechnungsdatum, getZahlungszielTage()),
        kundeId: kunde.id,
        kunde: buildKundeSnapshot(kunde),
        posten: [
          {
            id: createImportPostenId(),
            menge: 1,
            einheit: 'Stk.',
            art: 'lohn',
            bezeichnung: invoice.titel,
            beschreibung: buildRechnungBeschreibung(invoice),
            preis: invoice.netto,
          },
        ],
      };

      await saveRechnung(saved);
      importedRechnungen.push(saved);
      result.imported += 1;
    } catch (err) {
      result.errors.push({
        name: invoice.toolTimeNr,
        message: err.message || String(err),
      });
    }
  }

  return result;
}

function buildOfferMarker(toolTimeNr) {
  return buildToolTimeMarker(toolTimeNr);
}

export function isDuplicateOffer(candidate, existingAngebote) {
  const marker = buildOfferMarker(candidate.toolTimeNr);
  return existingAngebote.some((angebot) =>
    (angebot.posten || []).some((posten) => String(posten.beschreibung || '').includes(marker))
  );
}

async function resolveKundeForOffer(candidateKunde, {
  existingKunden,
  importedKunden,
  saveKunde,
  generiereKundennummer,
  getAllKunden,
  createKundeId,
}) {
  const duplicatePool = [...existingKunden, ...importedKunden];
  const existing = findDuplicateKunde(candidateKunde, duplicatePool);
  if (existing) {
    return { kunde: existing, created: false };
  }

  const jetzt = new Date().toISOString();
  const kundenNr = await generiereKundennummer(getAllKunden);
  const saved = {
    id: createKundeId(),
    kundenNr,
    anrede: candidateKunde.anrede,
    name: candidateKunde.name,
    strasse: candidateKunde.strasse,
    plzOrt: candidateKunde.plzOrt,
    adresse: candidateKunde.adresse,
    telefon: candidateKunde.telefon,
    email: candidateKunde.email,
    notiz: candidateKunde.notiz,
    erstelltAm: jetzt,
    aktualisiertAm: jetzt,
  };
  await saveKunde(saved);
  importedKunden.push(saved);
  return { kunde: saved, created: true };
}

export async function importToolTimeOffers(csvText, {
  saveAngebot,
  saveKunde,
  getAllAngebote,
  getAllKunden,
  generiereAngebotsnummer,
  generiereKundennummer,
  createAngebotId,
  createKundeId,
}) {
  const rows = parseSemicolonCsv(csvText);
  const offers = rows.map(mapToolTimeRowToAngebot).filter(Boolean);
  const existingAngebote = await getAllAngebote();
  const existingKunden = await getAllKunden();
  const importedKunden = [];
  const importedAngebote = [];

  const result = {
    total: offers.length,
    imported: 0,
    skipped: rows.length - offers.length,
    duplicates: 0,
    customersCreated: 0,
    errors: [],
  };

  for (const offer of offers) {
    if (isDuplicateOffer(offer, [...existingAngebote, ...importedAngebote])) {
      result.duplicates += 1;
      result.skipped += 1;
      continue;
    }

    try {
      const { kunde, created } = await resolveKundeForOffer(offer.kunde, {
        existingKunden,
        importedKunden,
        saveKunde,
        generiereKundennummer,
        getAllKunden,
        createKundeId,
      });
      if (created) result.customersCreated += 1;

      const jetzt = new Date().toISOString();
      const angebotNr = await generiereAngebotsnummer();
      const saved = {
        id: createAngebotId(),
        angebotNr,
        erstelltAm: jetzt,
        aktualisiertAm: jetzt,
        angebotsdatum: offer.angebotsdatum,
        gueltigBis: '',
        kundeId: kunde.id,
        kunde: buildKundeSnapshot(kunde),
        posten: [
          {
            id: createImportPostenId(),
            menge: 1,
            einheit: 'Stk.',
            art: 'lohn',
            bezeichnung: offer.titel,
            beschreibung: buildOfferMarker(offer.toolTimeNr),
            preis: offer.netto,
          },
        ],
        prozessStatus: offer.prozessStatus,
      };

      await saveAngebot(saved);
      importedAngebote.push(saved);
      result.imported += 1;
    } catch (err) {
      result.errors.push({
        name: offer.toolTimeNr,
        message: err.message || String(err),
      });
    }
  }

  return result;
}

export async function importToolTimeCustomers(csvText, {
  saveKunde,
  getAllKunden,
  generiereKundennummer,
  createKundeId,
}) {
  const rows = parseSemicolonCsv(csvText);
  const customers = rows.map(mapToolTimeRowToKunde).filter(Boolean);
  const existingKunden = await getAllKunden();
  const importedKunden = [];

  const result = {
    total: customers.length,
    imported: 0,
    skipped: rows.length - customers.length,
    duplicates: 0,
    errors: [],
  };

  for (const customer of customers) {
    const duplicatePool = [...existingKunden, ...importedKunden];
    if (findDuplicateKunde(customer, duplicatePool)) {
      result.duplicates += 1;
      result.skipped += 1;
      continue;
    }

    try {
      const jetzt = new Date().toISOString();
      const kundenNr = await generiereKundennummer(getAllKunden);
      const saved = {
        id: createKundeId(),
        kundenNr,
        anrede: customer.anrede,
        name: customer.name,
        strasse: customer.strasse,
        plzOrt: customer.plzOrt,
        adresse: customer.adresse,
        telefon: customer.telefon,
        email: customer.email,
        notiz: customer.notiz,
        erstelltAm: jetzt,
        aktualisiertAm: jetzt,
      };
      await saveKunde(saved);
      importedKunden.push(saved);
      result.imported += 1;
    } catch (err) {
      result.errors.push({
        name: customer.name,
        message: err.message || String(err),
      });
    }
  }

  return result;
}
