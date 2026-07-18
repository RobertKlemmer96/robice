import { getPdfTemplate } from './pdfTemplate.js';

export const DEFAULT_ANGEBOT_SCHEMA = 'ANG-{YYYY}{MM}{DD}-{NR:3}';
export const DEFAULT_RECHNUNG_SCHEMA = 'RE-{YYYY}{MM}{DD}-{NR:3}';

const DATE_TOKEN_RE = /\{YYYY\}|\{YY\}|\{MM\}|\{DD\}|\{YYYYMMDD\}/;

export function schemaHasSequenceToken(schema) {
  const s = String(schema || '');
  return /\{NR:\d+\}/.test(s) || /\{N+\}/.test(s);
}

export function schemaUsesDateTokens(schema) {
  return DATE_TOKEN_RE.test(String(schema || ''));
}

export function getAngebotsnummerSchema() {
  const tpl = getPdfTemplate();
  const raw = tpl.angebot?.nummerSchema;
  const schema = String(raw ?? '').trim();
  return schema || DEFAULT_ANGEBOT_SCHEMA;
}

export function getRechnungsnummerSchema() {
  const tpl = getPdfTemplate();
  const raw = tpl.rechnung?.nummerSchema;
  const schema = String(raw ?? '').trim();
  return schema || DEFAULT_RECHNUNG_SCHEMA;
}

export function getZahlungszielTage() {
  const tpl = getPdfTemplate();
  const days = Number(tpl.rechnung?.zahlungszielTage);
  return Number.isFinite(days) && days >= 0 ? days : 14;
}

function applyDateTokens(schema, date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = String(d.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyymmdd = `${yyyy}${mm}${dd}`;

  return schema
    .replace(/\{YYYY\}/g, yyyy)
    .replace(/\{YY\}/g, yy)
    .replace(/\{MM\}/g, mm)
    .replace(/\{DD\}/g, dd)
    .replace(/\{YYYYMMDD\}/g, yyyymmdd);
}

function getSequenceSpec(schema) {
  const nrMatch = schema.match(/\{NR:(\d+)\}/);
  if (nrMatch) {
    return { width: Number(nrMatch[1]), pattern: new RegExp(`^(\\d{${nrMatch[1]}})`) };
  }
  const nMatch = schema.match(/\{(N+)\}/);
  if (nMatch) {
    const width = nMatch[1].length;
    return { width, pattern: new RegExp(`^(\\d{${width}})`) };
  }
  return null;
}

export function getSchemaCountPrefix(schema, date = new Date()) {
  const normalized = String(schema || DEFAULT_ANGEBOT_SCHEMA).trim() || DEFAULT_ANGEBOT_SCHEMA;
  let prefix = applyDateTokens(normalized, date);
  prefix = prefix.replace(/\{NR:\d+\}/g, '');
  prefix = prefix.replace(/\{N+\}/g, '');
  return prefix;
}

export function getNextSequenceForPrefix(items, schema, prefix, nrField) {
  const spec = getSequenceSpec(schema);
  if (!spec) return 1;

  let max = 0;
  for (const item of items) {
    const nr = item?.[nrField];
    if (!nr || !nr.startsWith(prefix)) continue;
    const rest = nr.slice(prefix.length);
    const match = rest.match(spec.pattern);
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }
  return max + 1;
}

export function formatDokumentnummer(schema, sequence, date = new Date()) {
  const normalized = String(schema || DEFAULT_ANGEBOT_SCHEMA).trim() || DEFAULT_ANGEBOT_SCHEMA;
  const seq = Math.max(1, Number(sequence) || 1);
  let result = applyDateTokens(normalized, date);

  if (/\{NR:\d+\}/.test(normalized)) {
    result = result.replace(/\{NR:(\d+)\}/g, (_, width) =>
      String(seq).padStart(Number(width), '0')
    );
  } else if (/\{N+\}/.test(normalized)) {
    result = result.replace(/\{(N+)\}/g, (_, ns) => String(seq).padStart(ns.length, '0'));
  } else {
    result = `${result}${seq}`;
  }

  return result;
}

export function previewAngebotsnummer(schema, date = new Date(), sequence = 1) {
  return formatDokumentnummer(schema, sequence, date);
}

export function previewRechnungsnummer(schema, date = new Date(), sequence = 1) {
  return formatDokumentnummer(schema, sequence, date);
}

export async function generiereAngebotsnummer(getAllAngebote) {
  const schema = getAngebotsnummerSchema();
  const heute = new Date();
  const prefix = getSchemaCountPrefix(schema, heute);
  const angebote = await getAllAngebote();
  const nextSeq = getNextSequenceForPrefix(angebote, schema, prefix, 'angebotNr');
  return formatDokumentnummer(schema, nextSeq, heute);
}

export async function generiereRechnungsnummer(getAllRechnungen) {
  const schema = getRechnungsnummerSchema();
  const heute = new Date();
  const prefix = getSchemaCountPrefix(schema, heute);
  const rechnungen = await getAllRechnungen();
  const nextSeq = getNextSequenceForPrefix(rechnungen, schema, prefix, 'rechnungNr');
  return formatDokumentnummer(schema, nextSeq, heute);
}

export function addDaysIso(date, days) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
