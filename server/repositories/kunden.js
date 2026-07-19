import { getDb } from '../db/index.js';
import { normalizeAdresse } from '../../src/adresse.js';

function rowToKunde(row) {
  return {
    id: row.id,
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
      `UPDATE kunden SET name = ?, adresse = ?, strasse = ?, plz_ort = ?, telefon = ?, email = ?, notiz = ?, aktualisiert_am = ?
       WHERE tenant_id = ? AND id = ?`
    ).run(
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
      `INSERT INTO kunden (id, tenant_id, name, adresse, strasse, plz_ort, telefon, email, notiz, erstellt_am, aktualisiert_am)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      prepared.id,
      tenantId,
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
