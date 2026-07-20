import {
  getSchemaCountPrefix,
  getNextSequenceForPrefix,
  formatDokumentnummer,
} from './dokumentnummer.js';

export const DEFAULT_KUNDE_SCHEMA = 'K-{NR:5}';

export function getKundennummerSchema() {
  return DEFAULT_KUNDE_SCHEMA;
}

export async function generiereKundennummer(getAllKunden) {
  const schema = getKundennummerSchema();
  const heute = new Date();
  const prefix = getSchemaCountPrefix(schema, heute);
  const kunden = await getAllKunden();
  const nextSeq = getNextSequenceForPrefix(kunden, schema, prefix, 'kundenNr');
  return formatDokumentnummer(schema, nextSeq, heute);
}
