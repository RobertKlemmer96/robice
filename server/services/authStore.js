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
        t.created_at AS tenant_created_at
      FROM users u
      JOIN tenants t ON t.id = u.tenant_id
      ORDER BY u.created_at DESC`
    )
    .all();
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
