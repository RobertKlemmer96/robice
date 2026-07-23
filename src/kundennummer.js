import { getPdfTemplate } from './pdfTemplate.js';
import {
  getSchemaCountPrefix,
  getNextSequenceForPrefix,
  formatDokumentnummer,
} from './dokumentnummer.js';

export const DEFAULT_KUNDE_SCHEMA = 'K-{NR:5}';

export function getKundennummerSchema() {
  const tpl = getPdfTemplate();
  const raw = tpl.kunde?.nummerSchema;
  const schema = String(raw ?? '').trim();
  return schema || DEFAULT_KUNDE_SCHEMA;
}

export function previewKundennummer(schema, date = new Date(), sequence = 1) {
  return formatDokumentnummer(schema, sequence, date);
}

export async function generiereKundennummer(getAllKunden) {
  const schema = getKundennummerSchema();
  const heute = new Date();
  const prefix = getSchemaCountPrefix(schema, heute);
  const kunden = await getAllKunden();
  const nextSeq = getNextSequenceForPrefix(kunden, schema, prefix, 'kundenNr');
  return formatDokumentnummer(schema, nextSeq, heute);
}
