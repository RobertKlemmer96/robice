import { getDb } from '../db/index.js';

function rowToObjekt(row) {
  return {
    id: row.id,
    kundeId: row.kunde_id,
    name: row.name,
    adresse: row.adresse || '',
    typ: row.typ || 'einsatz',
    erstelltAm: row.erstellt_am,
    aktualisiertAm: row.aktualisiert_am,
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
  const typ = objekt.typ === 'rechnung' ? 'rechnung' : 'einsatz';
  const existing = db
    .prepare(
      `SELECT id FROM kunden_objekte WHERE tenant_id = ? AND kunde_id = ? AND id = ?`
    )
    .get(tenantId, kundeId, objekt.id);

  if (existing) {
    db.prepare(
      `UPDATE kunden_objekte
       SET name = ?, adresse = ?, typ = ?, aktualisiert_am = ?
       WHERE tenant_id = ? AND kunde_id = ? AND id = ?`
    ).run(
      objekt.name,
      objekt.adresse || '',
      typ,
      objekt.aktualisiertAm,
      tenantId,
      kundeId,
      objekt.id
    );
  } else {
    db.prepare(
      `INSERT INTO kunden_objekte
       (id, tenant_id, kunde_id, name, adresse, typ, erstellt_am, aktualisiert_am)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      objekt.id,
      tenantId,
      kundeId,
      objekt.name,
      objekt.adresse || '',
      typ,
      objekt.erstelltAm,
      objekt.aktualisiertAm
    );
  }

  return getObjekt(tenantId, kundeId, objekt.id);
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
