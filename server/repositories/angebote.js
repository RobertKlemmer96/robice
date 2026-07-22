import { getDb } from '../db/index.js';

const VALID_PROZESS_STATUS = new Set(['gespeichert', 'versendet', 'bestaetigt', 'abgelehnt']);

function normalizeProzessStatus(value) {
  const key = String(value || '').trim().toLowerCase();
  return VALID_PROZESS_STATUS.has(key) ? key : 'gespeichert';
}

function rowToAngebot(row) {
  return {
    id: row.id,
    angebotNr: row.angebot_nr,
    erstelltAm: row.erstellt_am,
    aktualisiertAm: row.aktualisiert_am,
    angebotsdatum: row.angebotsdatum,
    gueltigBis: row.gueltig_bis,
    prozessStatus: normalizeProzessStatus(row.prozess_status),
    kundeId: row.kunde_id || null,
    kunde: JSON.parse(row.kunde_json),
    posten: JSON.parse(row.posten_json),
  };
}

export function listAngebote(tenantId) {
  const db = getDb();
  return db
    .prepare(
      'SELECT * FROM angebote WHERE tenant_id = ? ORDER BY aktualisiert_am DESC'
    )
    .all(tenantId)
    .map(rowToAngebot);
}

export function getAngebot(tenantId, id) {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM angebote WHERE tenant_id = ? AND id = ?')
    .get(tenantId, id);
  return row ? rowToAngebot(row) : null;
}

export function saveAngebot(tenantId, angebot) {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM angebote WHERE tenant_id = ? AND id = ?')
    .get(tenantId, angebot.id);

  const kundeJson = JSON.stringify(angebot.kunde || { name: '', adresse: '' });
  const postenJson = JSON.stringify(angebot.posten || []);

  if (existing) {
    db.prepare(
      `UPDATE angebote SET kunde_id = ?, angebot_nr = ?, erstellt_am = ?, aktualisiert_am = ?,
       angebotsdatum = ?, gueltig_bis = ?, prozess_status = ?, kunde_json = ?, posten_json = ? WHERE tenant_id = ? AND id = ?`
    ).run(
      angebot.kundeId || null,
      angebot.angebotNr,
      angebot.erstelltAm,
      angebot.aktualisiertAm,
      angebot.angebotsdatum || null,
      angebot.gueltigBis || null,
      normalizeProzessStatus(angebot.prozessStatus),
      kundeJson,
      postenJson,
      tenantId,
      angebot.id
    );
  } else {
    db.prepare(
      `INSERT INTO angebote (id, tenant_id, kunde_id, angebot_nr, erstellt_am, aktualisiert_am,
       angebotsdatum, gueltig_bis, prozess_status, kunde_json, posten_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      angebot.id,
      tenantId,
      angebot.kundeId || null,
      angebot.angebotNr,
      angebot.erstelltAm,
      angebot.aktualisiertAm,
      angebot.angebotsdatum || null,
      angebot.gueltigBis || null,
      normalizeProzessStatus(angebot.prozessStatus),
      kundeJson,
      postenJson
    );
  }
  return getAngebot(tenantId, angebot.id);
}

export function deleteAngebot(tenantId, id) {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM angebote WHERE tenant_id = ? AND id = ?')
    .run(tenantId, id);
  return result.changes > 0;
}

export function updateAngebotProzessStatus(tenantId, id, prozessStatus) {
  const key = String(prozessStatus || '').trim().toLowerCase();
  if (!VALID_PROZESS_STATUS.has(key)) {
    const err = new Error('Invalid prozess status');
    err.code = 'INVALID_PROZESS_STATUS';
    throw err;
  }

  const db = getDb();
  const result = db
    .prepare(
      `UPDATE angebote SET prozess_status = ?, aktualisiert_am = ? WHERE tenant_id = ? AND id = ?`
    )
    .run(key, new Date().toISOString(), tenantId, id);

  if (result.changes === 0) return null;
  return getAngebot(tenantId, id);
}
