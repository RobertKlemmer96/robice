import { getDb } from '../db/index.js';

function rowToRechnung(row) {
  const doc = {
    id: row.id,
    rechnungNr: row.rechnung_nr,
    erstelltAm: row.erstellt_am,
    aktualisiertAm: row.aktualisiert_am,
    rechnungsdatum: row.rechnungsdatum,
    faelligAm: row.faellig_am,
    kundeId: row.kunde_id || null,
    kunde: JSON.parse(row.kunde_json),
    posten: JSON.parse(row.posten_json),
  };
  if (row.angebot_id) doc.angebotId = row.angebot_id;
  if (row.angebot_nr) doc.angebotNr = row.angebot_nr;
  return doc;
}

export function listRechnungen(tenantId) {
  const db = getDb();
  return db
    .prepare(
      'SELECT * FROM rechnungen WHERE tenant_id = ? ORDER BY aktualisiert_am DESC'
    )
    .all(tenantId)
    .map(rowToRechnung);
}

export function getRechnung(tenantId, id) {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM rechnungen WHERE tenant_id = ? AND id = ?')
    .get(tenantId, id);
  return row ? rowToRechnung(row) : null;
}

export function saveRechnung(tenantId, rechnung) {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM rechnungen WHERE tenant_id = ? AND id = ?')
    .get(tenantId, rechnung.id);

  const kundeJson = JSON.stringify(rechnung.kunde || { name: '', adresse: '' });
  const postenJson = JSON.stringify(rechnung.posten || []);

  if (existing) {
    db.prepare(
      `UPDATE rechnungen SET kunde_id = ?, angebot_id = ?, angebot_nr = ?, rechnung_nr = ?,
       erstellt_am = ?, aktualisiert_am = ?, rechnungsdatum = ?, faellig_am = ?,
       kunde_json = ?, posten_json = ? WHERE tenant_id = ? AND id = ?`
    ).run(
      rechnung.kundeId || null,
      rechnung.angebotId || null,
      rechnung.angebotNr || null,
      rechnung.rechnungNr,
      rechnung.erstelltAm,
      rechnung.aktualisiertAm,
      rechnung.rechnungsdatum || null,
      rechnung.faelligAm || null,
      kundeJson,
      postenJson,
      tenantId,
      rechnung.id
    );
  } else {
    db.prepare(
      `INSERT INTO rechnungen (id, tenant_id, kunde_id, angebot_id, angebot_nr, rechnung_nr,
       erstellt_am, aktualisiert_am, rechnungsdatum, faellig_am, kunde_json, posten_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      rechnung.id,
      tenantId,
      rechnung.kundeId || null,
      rechnung.angebotId || null,
      rechnung.angebotNr || null,
      rechnung.rechnungNr,
      rechnung.erstelltAm,
      rechnung.aktualisiertAm,
      rechnung.rechnungsdatum || null,
      rechnung.faelligAm || null,
      kundeJson,
      postenJson
    );
  }
  return getRechnung(tenantId, rechnung.id);
}

export function deleteRechnung(tenantId, id) {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM rechnungen WHERE tenant_id = ? AND id = ?')
    .run(tenantId, id);
  return result.changes > 0;
}
