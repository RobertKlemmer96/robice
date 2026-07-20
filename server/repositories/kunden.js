import { getDb } from '../db/index.js';
import { normalizeAdresse } from '../../src/adresse.js';
import { normalizeKundeAnrede } from '../../src/kundeStammdaten.js';

function rowToKunde(row) {
  return {
    id: row.id,
    kundenNr: row.kunden_nr || '',
    anrede: normalizeKundeAnrede(row.anrede),
    name: row.name,
    ...normalizeAdresse({
      strasse: row.strasse,
      plz_ort: row.plz_ort,
      adresse: row.adresse,
    }),
    telefon: row.telefon || '',
    email: row.email || '',
    notiz: row.notiz || '',
    erstelltAm: row.erstellt_am,
    aktualisiertAm: row.aktualisiert_am,
  };
}

function prepareKundeForSave(kunde) {
  const addr = normalizeAdresse(kunde);
  return {
    ...kunde,
    kundenNr: String(kunde.kundenNr || '').trim(),
    anrede: normalizeKundeAnrede(kunde.anrede),
    strasse: addr.strasse,
    plzOrt: addr.plzOrt,
    adresse: addr.adresse,
  };
}

export function listKunden(tenantId) {
  const db = getDb();
  return db
    .prepare(
      'SELECT * FROM kunden WHERE tenant_id = ? ORDER BY aktualisiert_am DESC'
    )
    .all(tenantId)
    .map(rowToKunde);
}

export function getKunde(tenantId, id) {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM kunden WHERE tenant_id = ? AND id = ?')
    .get(tenantId, id);
  return row ? rowToKunde(row) : null;
}

export function saveKunde(tenantId, kunde) {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM kunden WHERE tenant_id = ? AND id = ?')
    .get(tenantId, kunde.id);

  const prepared = prepareKundeForSave(kunde);
  const telefon = prepared.telefon || '';
  const email = prepared.email || '';
  const notiz = prepared.notiz || '';

  if (existing) {
    db.prepare(
      `UPDATE kunden SET kunden_nr = ?, anrede = ?, name = ?, adresse = ?, strasse = ?, plz_ort = ?, telefon = ?, email = ?, notiz = ?, aktualisiert_am = ?
       WHERE tenant_id = ? AND id = ?`
    ).run(
      prepared.kundenNr,
      prepared.anrede,
      prepared.name,
      prepared.adresse,
      prepared.strasse,
      prepared.plzOrt,
      telefon,
      email,
      notiz,
      prepared.aktualisiertAm,
      tenantId,
      prepared.id
    );
  } else {
    db.prepare(
      `INSERT INTO kunden (id, tenant_id, kunden_nr, anrede, name, adresse, strasse, plz_ort, telefon, email, notiz, erstellt_am, aktualisiert_am)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      prepared.id,
      tenantId,
      prepared.kundenNr,
      prepared.anrede,
      prepared.name,
      prepared.adresse,
      prepared.strasse,
      prepared.plzOrt,
      telefon,
      email,
      notiz,
      prepared.erstelltAm,
      prepared.aktualisiertAm
    );
  }
  return getKunde(tenantId, prepared.id);
}

export function deleteKunde(tenantId, id) {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM kunden WHERE tenant_id = ? AND id = ?')
    .run(tenantId, id);
  return result.changes > 0;
}
