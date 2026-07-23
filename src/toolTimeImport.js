import { normalizeAdresse } from './adresse.js';
import { normalizeKundeAnrede } from './kundeStammdaten.js';

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
