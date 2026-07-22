import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb, runTransaction } from '../db/index.js';
import { config } from '../config.js';
import { getPdfTemplate } from '../repositories/pdfTemplate.js';
import { PDF_TEMPLATE_DEFAULT } from '../defaults/pdfTemplate.js';
import { removeTenantAssets } from './assets.js';

const SALT_ROUNDS = 12;

export const REGISTRATION_PLANS = ['free', 'plus', 'pro'];

export function normalizeRegistrationPlan(plan) {
  const value = String(plan || 'free').trim().toLowerCase();
  return REGISTRATION_PLANS.includes(value) ? value : 'free';
}

export function createId(prefix) {
  return `${prefix}_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

export function findUserByEmail(email) {
  const db = getDb();
  return db
    .prepare('SELECT id, tenant_id, email, password_hash, role FROM users WHERE email = ?')
    .get(email.trim().toLowerCase());
}

export function findUserById(id) {
  const db = getDb();
  return db.prepare('SELECT id, tenant_id, email, role FROM users WHERE id = ?').get(id);
}

export function findUserAuthById(id) {
  const db = getDb();
  return db
    .prepare('SELECT id, tenant_id, email, password_hash, role FROM users WHERE id = ?')
    .get(id);
}

export function updateUserPassword(userId, passwordHash) {
  const db = getDb();
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createTenantWithOwner({ tenantName, email, passwordHash, plan = 'free' }) {
  const tenantId = createId('tenant');
  const userId = createId('user');
  const now = new Date().toISOString();
  const normalizedEmail = email.trim().toLowerCase();
  const tenantPlan = normalizeRegistrationPlan(plan);

  runTransaction((db) => {
    db.prepare(
      'INSERT INTO tenants (id, name, plan, created_at, onboarding_completed) VALUES (?, ?, ?, ?, ?)'
    ).run(tenantId, tenantName.trim(), tenantPlan, now, 0);
    db.prepare(
      'INSERT INTO users (id, tenant_id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, tenantId, normalizedEmail, passwordHash, 'owner', now);
  });

  return { tenantId, userId, email: normalizedEmail };
}

export function ensureDefaultTenantAdmin(passwordHash) {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return null;

  const tenantId = createId('tenant');
  const userId = createId('user');
  const now = new Date().toISOString();

  runTransaction((dbConn) => {
    dbConn.prepare(
      'INSERT INTO tenants (id, name, plan, created_at, onboarding_completed) VALUES (?, ?, ?, ?, ?)'
    ).run(tenantId, config.defaultTenantName, 'free', now, 1);
    dbConn.prepare(
      'INSERT INTO users (id, tenant_id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      userId,
      tenantId,
      config.adminEmail.toLowerCase(),
      passwordHash,
      'owner',
      now
    );
  });

  return { tenantId, userId, email: config.adminEmail.toLowerCase() };
}

export function ensureSystemAdmin(passwordHash) {
  const db = getDb();
  const email = config.adminEmail.trim().toLowerCase();
  const existing = findUserByEmail(email);

  if (!existing) {
    const tenantId = createId('tenant');
    const userId = createId('user');
    const now = new Date().toISOString();

    runTransaction((dbConn) => {
      dbConn.prepare(
        'INSERT INTO tenants (id, name, plan, created_at, onboarding_completed) VALUES (?, ?, ?, ?, ?)'
      ).run(tenantId, 'KlemDesk Admin', 'admin', now, 0);
      dbConn.prepare(
        'INSERT INTO users (id, tenant_id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(userId, tenantId, email, passwordHash, 'admin', now);
    });

    return { tenantId, userId, email };
  }

  db.prepare('UPDATE users SET role = ?, password_hash = ? WHERE id = ?').run(
    'admin',
    passwordHash,
    existing.id
  );

  return { tenantId: existing.tenant_id, userId: existing.id, email };
}

export function listAllUsersWithTenants() {
  const db = getDb();
  return db
    .prepare(
      `SELECT
        u.id,
        u.email,
        u.role,
        u.created_at AS user_created_at,
        t.id AS tenant_id,
        t.name AS tenant_name,
        t.plan AS tenant_plan,
        t.created_at AS tenant_created_at,
        t.onboarding_completed AS tenant_onboarding_completed
      FROM users u
      JOIN tenants t ON t.id = u.tenant_id
      ORDER BY u.created_at DESC`
    )
    .all();
}

export function listAllUsersWithStats() {
  const db = getDb();
  return db
    .prepare(
      `SELECT
        u.id,
        u.email,
        u.role,
        u.created_at AS user_created_at,
        t.id AS tenant_id,
        t.name AS tenant_name,
        t.plan AS tenant_plan,
        t.created_at AS tenant_created_at,
        t.onboarding_completed AS tenant_onboarding_completed,
        (SELECT COUNT(*) FROM kunden k WHERE k.tenant_id = t.id) AS kunden_count,
        (SELECT COUNT(*) FROM angebote a WHERE a.tenant_id = t.id) AS angebote_count,
        (SELECT COUNT(*) FROM rechnungen r WHERE r.tenant_id = t.id) AS rechnungen_count,
        (SELECT COUNT(*) FROM katalog_posten kp WHERE kp.tenant_id = t.id) AS katalog_count,
        (
          SELECT MAX(ts) FROM (
            SELECT aktualisiert_am AS ts FROM angebote WHERE tenant_id = t.id
            UNION ALL
            SELECT aktualisiert_am AS ts FROM rechnungen WHERE tenant_id = t.id
            UNION ALL
            SELECT aktualisiert_am AS ts FROM kunden WHERE tenant_id = t.id
          )
        ) AS last_activity_at
      FROM users u
      JOIN tenants t ON t.id = u.tenant_id
      ORDER BY u.created_at DESC`
    )
    .all();
}

export function getTenantDashboard(tenantId, tenantName = '') {
  const db = getDb();
  const stats = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM kunden WHERE tenant_id = ?) AS kunden,
        (SELECT COUNT(*) FROM angebote WHERE tenant_id = ?) AS angebote,
        (SELECT COUNT(*) FROM rechnungen WHERE tenant_id = ?) AS rechnungen,
        (SELECT COUNT(*) FROM katalog_posten WHERE tenant_id = ?) AS katalog,
        (SELECT COUNT(*) FROM angebote WHERE tenant_id = ? AND strftime('%Y-%m', erstellt_am) = strftime('%Y-%m', 'now')) AS angebote_monat,
        (SELECT COUNT(*) FROM rechnungen WHERE tenant_id = ? AND strftime('%Y-%m', erstellt_am) = strftime('%Y-%m', 'now')) AS rechnungen_monat,
        (
          SELECT COUNT(*) FROM rechnungen
          WHERE tenant_id = ?
            AND faellig_am IS NOT NULL
            AND faellig_am != ''
            AND date(faellig_am) >= date('now')
            AND date(faellig_am) <= date('now', '+14 days')
        ) AS faellig_bald,
        (
          SELECT MAX(ts) FROM (
            SELECT aktualisiert_am AS ts FROM angebote WHERE tenant_id = ?
            UNION ALL
            SELECT aktualisiert_am AS ts FROM rechnungen WHERE tenant_id = ?
            UNION ALL
            SELECT aktualisiert_am AS ts FROM kunden WHERE tenant_id = ?
          )
        ) AS last_activity_at`
    )
    .get(
      tenantId,
      tenantId,
      tenantId,
      tenantId,
      tenantId,
      tenantId,
      tenantId,
      tenantId,
      tenantId,
      tenantId
    );

  const recentAngebote = db
    .prepare(
      `SELECT id, angebot_nr, kunde_json, aktualisiert_am, angebotsdatum
       FROM angebote
       WHERE tenant_id = ?
       ORDER BY aktualisiert_am DESC
       LIMIT 5`
    )
    .all(tenantId)
    .map((row) => {
      let customer = '';
      try {
        customer = JSON.parse(row.kunde_json)?.name || '';
      } catch {
        customer = '';
      }
      return {
        id: row.id,
        type: 'angebot',
        number: row.angebot_nr,
        customer,
        date: row.angebotsdatum || row.aktualisiert_am,
        updatedAt: row.aktualisiert_am,
      };
    });

  const recentRechnungen = db
    .prepare(
      `SELECT id, rechnung_nr, kunde_json, aktualisiert_am, rechnungsdatum
       FROM rechnungen
       WHERE tenant_id = ?
       ORDER BY aktualisiert_am DESC
       LIMIT 5`
    )
    .all(tenantId)
    .map((row) => {
      let customer = '';
      try {
        customer = JSON.parse(row.kunde_json)?.name || '';
      } catch {
        customer = '';
      }
      return {
        id: row.id,
        type: 'rechnung',
        number: row.rechnung_nr,
        customer,
        date: row.rechnungsdatum || row.aktualisiert_am,
        updatedAt: row.aktualisiert_am,
      };
    });

  const recentDocuments = [...recentAngebote, ...recentRechnungen]
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 8);

  return {
    stats: {
      kunden: stats?.kunden ?? 0,
      angebote: stats?.angebote ?? 0,
      rechnungen: stats?.rechnungen ?? 0,
      katalog: stats?.katalog ?? 0,
      angeboteMonat: stats?.angebote_monat ?? 0,
      rechnungenMonat: stats?.rechnungen_monat ?? 0,
      faelligBald: stats?.faellig_bald ?? 0,
    },
    lastActivityAt: stats?.last_activity_at ?? null,
    recentDocuments,
    setupMissing: getFirmaSetupMissing(tenantId, tenantName),
  };
}

function getFirmaSetupMissing(tenantId, tenantName = '') {
  const db = getDb();
  const row = db
    .prepare('SELECT template_json FROM pdf_templates WHERE tenant_id = ?')
    .get(tenantId);

  let firma = {};
  if (row?.template_json) {
    try {
      firma = JSON.parse(row.template_json)?.firma ?? {};
    } catch {
      firma = {};
    }
  }

  const missing = [];
  if (!(String(tenantName || firma.name || '').trim())) missing.push('companyName');
  if (!String(firma.strasse || '').trim()) missing.push('street');
  if (!String(firma.plzOrt || '').trim()) missing.push('zipCity');
  if (!String(firma.telefon || '').trim()) missing.push('phone');
  if (!String(firma.email || '').trim()) missing.push('email');
  if (!String(firma.ustId || '').trim()) missing.push('vatId');
  if (!String(firma.iban || '').trim()) missing.push('iban');
  return missing;
}

export function getAdminOverviewStats() {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM tenants WHERE plan != 'admin') AS tenants,
        (SELECT COUNT(*) FROM angebote) AS angebote,
        (SELECT COUNT(*) FROM rechnungen) AS rechnungen,
        (SELECT COUNT(*) FROM kunden) AS kunden,
        (SELECT COUNT(*) FROM katalog_posten) AS katalog_posten`
    )
    .get();
  return row;
}

export function getTenantOwnerEmail(tenantId) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT email FROM users
       WHERE tenant_id = ? AND role = 'owner'
       ORDER BY created_at ASC
       LIMIT 1`
    )
    .get(tenantId);
  return row?.email || null;
}

export function getTenantById(tenantId) {
  const db = getDb();
  return db
    .prepare(
      'SELECT id, name, plan, created_at, onboarding_completed FROM tenants WHERE id = ?'
    )
    .get(tenantId);
}

export function completeTenantOnboarding(tenantId) {
  const db = getDb();
  db.prepare('UPDATE tenants SET onboarding_completed = 1 WHERE id = ?').run(tenantId);
}

export function tenantToJson(tenant) {
  if (!tenant) return null;
  return {
    id: tenant.id,
    name: tenant.name,
    plan: tenant.plan,
    onboardingCompleted: Boolean(tenant.onboarding_completed),
  };
}

export function updateTenantName(tenantId, name) {
  const db = getDb();
  db.prepare('UPDATE tenants SET name = ? WHERE id = ?').run(name.trim(), tenantId);
}

export function extractPlzFromPlzOrt(plzOrt) {
  const raw = String(plzOrt || '').trim();
  const match = raw.match(/(\d{5})/);
  return match ? match[1] : raw.split(/\s+/)[0] || '';
}

export function normalizePlzInput(plz) {
  return String(plz || '').trim().replace(/\D/g, '');
}

export async function deleteTenantAccount(tenantId) {
  const tenant = getTenantById(tenantId);
  if (!tenant) return false;
  if (tenant.plan === 'admin') {
    throw new Error('Dieses Konto kann nicht gelöscht werden.');
  }

  runTransaction((database) => {
    database.prepare('DELETE FROM tenants WHERE id = ?').run(tenantId);
  });

  await removeTenantAssets(tenantId);
  return true;
}

export async function verifyTenantBillingPlz(tenantId, plzInput) {
  const template = await getPdfTemplate(tenantId, PDF_TEMPLATE_DEFAULT);
  const expected = normalizePlzInput(extractPlzFromPlzOrt(template?.firma?.plzOrt));
  const given = normalizePlzInput(plzInput);
  return expected.length > 0 && expected === given;
}
