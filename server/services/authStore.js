import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb, runTransaction } from '../db/index.js';
import { config } from '../config.js';

const SALT_ROUNDS = 12;

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

export function createTenantWithOwner({ tenantName, email, passwordHash }) {
  const tenantId = createId('tenant');
  const userId = createId('user');
  const now = new Date().toISOString();
  const normalizedEmail = email.trim().toLowerCase();

  runTransaction((db) => {
    db.prepare(
      'INSERT INTO tenants (id, name, plan, created_at) VALUES (?, ?, ?, ?)'
    ).run(tenantId, tenantName.trim(), 'free', now);
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
      'INSERT INTO tenants (id, name, plan, created_at) VALUES (?, ?, ?, ?)'
    ).run(tenantId, config.defaultTenantName, 'free', now);
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

export function getTenantById(tenantId) {
  const db = getDb();
  return db.prepare('SELECT id, name, plan, created_at FROM tenants WHERE id = ?').get(tenantId);
}

export function updateTenantName(tenantId, name) {
  const db = getDb();
  db.prepare('UPDATE tenants SET name = ? WHERE id = ?').run(name.trim(), tenantId);
}
