import { getDb } from '../db/index.js';

function rowToNotification(row, seenAt) {
  let customer = '';
  try {
    customer = JSON.parse(row.kunde_json)?.name || '';
  } catch {
    customer = '';
  }
  const respondedAt = row.confirmation_responded_at || row.aktualisiert_am;
  const unread =
    !seenAt || (respondedAt && String(respondedAt).localeCompare(String(seenAt)) > 0);

  return {
    id: row.id,
    angebotNr: row.angebot_nr,
    customer,
    status: row.prozess_status,
    respondedAt,
    unread,
  };
}

export function getTenantNotifications(tenantId) {
  const db = getDb();
  const tenant = db
    .prepare('SELECT notifications_seen_at FROM tenants WHERE id = ?')
    .get(tenantId);
  const seenAt = tenant?.notifications_seen_at || null;

  const rows = db
    .prepare(
      `SELECT id, angebot_nr, kunde_json, prozess_status, confirmation_responded_at, aktualisiert_am
       FROM angebote
       WHERE tenant_id = ?
         AND prozess_status IN ('bestaetigt', 'abgelehnt')
         AND confirmation_responded_at IS NOT NULL
       ORDER BY confirmation_responded_at DESC
       LIMIT 20`
    )
    .all(tenantId);

  const items = rows.map((row) => rowToNotification(row, seenAt));
  const unreadCount = getTenantNotificationUnreadCount(tenantId);

  return { unreadCount, items };
}

export function getTenantNotificationUnreadCount(tenantId) {
  const db = getDb();
  const tenant = db
    .prepare('SELECT notifications_seen_at FROM tenants WHERE id = ?')
    .get(tenantId);
  const seenAt = tenant?.notifications_seen_at;

  const row = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM angebote
       WHERE tenant_id = ?
         AND prozess_status IN ('bestaetigt', 'abgelehnt')
         AND confirmation_responded_at IS NOT NULL
         AND (? IS NULL OR confirmation_responded_at > ?)`
    )
    .get(tenantId, seenAt, seenAt);

  return row?.count ?? 0;
}

export function markTenantNotificationsSeen(tenantId) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE tenants SET notifications_seen_at = ? WHERE id = ?').run(now, tenantId);
  return now;
}
