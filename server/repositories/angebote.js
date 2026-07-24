import crypto from 'crypto';
import { getDb } from '../db/index.js';
import { extractPlzFromPlzOrt, normalizePlzInput } from '../services/authStore.js';
import { assertCanCreateAngebot } from '../services/planLimits.js';

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
    confirmationToken: row.confirmation_token || null,
    confirmationRespondedAt: row.confirmation_responded_at || null,
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

export function getAngebotByConfirmationToken(token) {
  const normalized = String(token || '').trim();
  if (!normalized) return null;
  const db = getDb();
  const row = db.prepare('SELECT * FROM angebote WHERE confirmation_token = ?').get(normalized);
  if (!row) return null;
  return { tenantId: row.tenant_id, ...rowToAngebot(row) };
}

export function ensureConfirmationToken(tenantId, id) {
  const db = getDb();
  const row = db
    .prepare('SELECT confirmation_token FROM angebote WHERE tenant_id = ? AND id = ?')
    .get(tenantId, id);
  if (!row) return null;
  if (row.confirmation_token) return row.confirmation_token;
  const token = crypto.randomUUID();
  db.prepare('UPDATE angebote SET confirmation_token = ? WHERE tenant_id = ? AND id = ?').run(
    token,
    tenantId,
    id
  );
  return token;
}

export function verifyAngebotKundePlz(kunde, plzInput) {
  const expected = normalizePlzInput(extractPlzFromPlzOrt(kunde?.plzOrt));
  const given = normalizePlzInput(plzInput);
  return expected.length > 0 && expected === given;
}

export function verifyAngebotConfirmationPlz(token, plzInput) {
  const angebot = getAngebotByConfirmationToken(token);
  if (!angebot) return { error: 'NOT_FOUND' };

  const status = normalizeProzessStatus(angebot.prozessStatus);
  if (status === 'bestaetigt' || status === 'abgelehnt') {
    return { error: 'ALREADY_RESPONDED', angebot };
  }

  if (!verifyAngebotKundePlz(angebot.kunde, plzInput)) {
    return { error: 'INVALID_PLZ' };
  }

  return { ok: true };
}

export function respondToAngebotConfirmation(token, plzInput, decision) {
  const angebot = getAngebotByConfirmationToken(token);
  if (!angebot) return { error: 'NOT_FOUND' };

  const status = normalizeProzessStatus(angebot.prozessStatus);
  if (status === 'bestaetigt' || status === 'abgelehnt') {
    return { error: 'ALREADY_RESPONDED', angebot };
  }

  if (!verifyAngebotKundePlz(angebot.kunde, plzInput)) {
    return { error: 'INVALID_PLZ' };
  }

  const nextStatus = decision === 'abgelehnt' ? 'abgelehnt' : 'bestaetigt';
  const now = new Date().toISOString();
  const db = getDb();
  db.prepare(
    `UPDATE angebote SET prozess_status = ?, confirmation_responded_at = ?, aktualisiert_am = ?
     WHERE confirmation_token = ?`
  ).run(nextStatus, now, now, String(token).trim());

  return {
    angebot: getAngebotByConfirmationToken(token),
    decision: nextStatus,
  };
}

export function saveAngebot(tenantId, angebot) {
  assertCanCreateAngebot(tenantId, angebot.id);

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
