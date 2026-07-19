import { getDb } from '../db/index.js';
import { normalizeAdresse } from '../../src/adresse.js';

function rowToObjekt(row) {
  return {
    id: row.id,
    kundeId: row.kunde_id,
    name: row.name,
    ...normalizeAdresse({
      strasse: row.strasse,
      plz_ort: row.plz_ort,
      adresse: row.adresse,
    }),
    typ: row.typ || 'einsatz',
    erstelltAm: row.erstellt_am,
    aktualisiertAm: row.aktualisiert_am,
  };
}

function prepareObjektForSave(objekt) {
  const addr = normalizeAdresse(objekt);
  return {
    ...objekt,
    strasse: addr.strasse,
    plzOrt: addr.plzOrt,
    adresse: addr.adresse,
  };
}

function kundeExists(tenantId, kundeId) {
  const db = getDb();
  return !!db
    .prepare('SELECT id FROM kunden WHERE tenant_id = ? AND id = ?')
    .get(tenantId, kundeId);
}

export function listObjekteForKunde(tenantId, kundeId) {
  if (!kundeExists(tenantId, kundeId)) return null;
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM kunden_objekte
       WHERE tenant_id = ? AND kunde_id = ?
       ORDER BY typ ASC, name COLLATE NOCASE ASC`
    )
    .all(tenantId, kundeId)
    .map(rowToObjekt);
}

export function getObjekt(tenantId, kundeId, objektId) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM kunden_objekte
       WHERE tenant_id = ? AND kunde_id = ? AND id = ?`
    )
    .get(tenantId, kundeId, objektId);
  return row ? rowToObjekt(row) : null;
}

export function saveObjekt(tenantId, kundeId, objekt) {
  if (!kundeExists(tenantId, kundeId)) return null;

  const db = getDb();
  const prepared = prepareObjektForSave(objekt);
  const typ = prepared.typ === 'rechnung' ? 'rechnung' : 'einsatz';
  const existing = db
    .prepare(
      `SELECT id FROM kunden_objekte WHERE tenant_id = ? AND kunde_id = ? AND id = ?`
    )
    .get(tenantId, kundeId, prepared.id);

  if (existing) {
    db.prepare(
      `UPDATE kunden_objekte
       SET name = ?, adresse = ?, strasse = ?, plz_ort = ?, typ = ?, aktualisiert_am = ?
       WHERE tenant_id = ? AND kunde_id = ? AND id = ?`
    ).run(
      prepared.name,
      prepared.adresse,
      prepared.strasse,
      prepared.plzOrt,
      typ,
      prepared.aktualisiertAm,
      tenantId,
      kundeId,
      prepared.id
    );
  } else {
    db.prepare(
      `INSERT INTO kunden_objekte
       (id, tenant_id, kunde_id, name, adresse, strasse, plz_ort, typ, erstellt_am, aktualisiert_am)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      prepared.id,
      tenantId,
      kundeId,
      prepared.name,
      prepared.adresse,
      prepared.strasse,
      prepared.plzOrt,
      typ,
      prepared.erstelltAm,
      prepared.aktualisiertAm
    );
  }

  return getObjekt(tenantId, kundeId, prepared.id);
}

export function deleteObjekt(tenantId, kundeId, objektId) {
  const db = getDb();
  const result = db
    .prepare(
      `DELETE FROM kunden_objekte WHERE tenant_id = ? AND kunde_id = ? AND id = ?`
    )
    .run(tenantId, kundeId, objektId);
  return result.changes > 0;
}
