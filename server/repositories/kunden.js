import { getDb } from '../db/index.js';

function rowToKunde(row) {
  return {
    id: row.id,
    name: row.name,
    adresse: row.adresse || '',
    telefon: row.telefon || '',
    email: row.email || '',
    notiz: row.notiz || '',
    erstelltAm: row.erstellt_am,
    aktualisiertAm: row.aktualisiert_am,
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

  const telefon = kunde.telefon || '';
  const email = kunde.email || '';
  const notiz = kunde.notiz || '';

  if (existing) {
    db.prepare(
      `UPDATE kunden SET name = ?, adresse = ?, telefon = ?, email = ?, notiz = ?, aktualisiert_am = ?
       WHERE tenant_id = ? AND id = ?`
    ).run(
      kunde.name,
      kunde.adresse || '',
      telefon,
      email,
      notiz,
      kunde.aktualisiertAm,
      tenantId,
      kunde.id
    );
  } else {
    db.prepare(
      `INSERT INTO kunden (id, tenant_id, name, adresse, telefon, email, notiz, erstellt_am, aktualisiert_am)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      kunde.id,
      tenantId,
      kunde.name,
      kunde.adresse || '',
      telefon,
      email,
      notiz,
      kunde.erstelltAm,
      kunde.aktualisiertAm
    );
  }
  return getKunde(tenantId, kunde.id);
}

export function deleteKunde(tenantId, id) {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM kunden WHERE tenant_id = ? AND id = ?')
    .run(tenantId, id);
  return result.changes > 0;
}
