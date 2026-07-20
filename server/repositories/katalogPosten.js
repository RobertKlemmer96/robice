import { getDb } from '../db/index.js';

function rowToPosten(row) {
  return {
    id: row.id,
    bezeichnung: row.bezeichnung,
    beschreibung: row.beschreibung || '',
    art: row.art || 'lohn',
    preisStk: row.preis_stk,
    preisStd: row.preis_std,
    erstelltAm: row.erstellt_am,
    aktualisiertAm: row.aktualisiert_am,
  };
}

export function listKatalogPosten(tenantId) {
  const db = getDb();
  return db
    .prepare(
      'SELECT * FROM katalog_posten WHERE tenant_id = ? ORDER BY bezeichnung COLLATE NOCASE ASC'
    )
    .all(tenantId)
    .map(rowToPosten);
}

export function getKatalogPosten(tenantId, id) {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM katalog_posten WHERE tenant_id = ? AND id = ?')
    .get(tenantId, id);
  return row ? rowToPosten(row) : null;
}

export function saveKatalogPosten(tenantId, posten) {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM katalog_posten WHERE tenant_id = ? AND id = ?')
    .get(tenantId, posten.id);

  const beschreibung = posten.beschreibung || '';
  const art = posten.art === 'material' ? 'material' : 'lohn';
  const preisStk = Number(posten.preisStk) || 0;
  const preisStd = Number(posten.preisStd) || 0;

  if (existing) {
    db.prepare(
      `UPDATE katalog_posten SET bezeichnung = ?, beschreibung = ?, art = ?, preis_stk = ?, preis_std = ?, aktualisiert_am = ?
       WHERE tenant_id = ? AND id = ?`
    ).run(
      posten.bezeichnung,
      beschreibung,
      art,
      preisStk,
      preisStd,
      posten.aktualisiertAm,
      tenantId,
      posten.id
    );
  } else {
    db.prepare(
      `INSERT INTO katalog_posten (id, tenant_id, bezeichnung, beschreibung, art, preis_stk, preis_std, erstellt_am, aktualisiert_am)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      posten.id,
      tenantId,
      posten.bezeichnung,
      beschreibung,
      art,
      preisStk,
      preisStd,
      posten.erstelltAm,
      posten.aktualisiertAm
    );
  }

  return getKatalogPosten(tenantId, posten.id);
}

export function deleteKatalogPosten(tenantId, id) {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM katalog_posten WHERE tenant_id = ? AND id = ?')
    .run(tenantId, id);
  return result.changes > 0;
}
