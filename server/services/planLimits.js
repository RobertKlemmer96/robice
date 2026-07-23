import { getDb } from '../db/index.js';
import { getTenantById } from './authStore.js';

export const FREE_DOCUMENT_LIMIT = 10;

export function isFreePlan(plan) {
  return String(plan || 'free').trim().toLowerCase() === 'free';
}

export function canSendMail(plan) {
  const value = String(plan || 'free').trim().toLowerCase();
  return value === 'plus' || value === 'pro' || value === 'admin';
}

export function canExportDatev(plan) {
  const value = String(plan || 'free').trim().toLowerCase();
  return value === 'plus' || value === 'pro' || value === 'admin';
}

function countDocuments(table, tenantId) {
  const db = getDb();
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE tenant_id = ?`)
    .get(tenantId);
  return row?.count ?? 0;
}

export function getDocumentLimits(tenantId, plan) {
  const angeboteUsed = countDocuments('angebote', tenantId);
  const rechnungenUsed = countDocuments('rechnungen', tenantId);
  const limited = isFreePlan(plan);
  const max = limited ? FREE_DOCUMENT_LIMIT : null;

  return {
    plan: String(plan || 'free').trim().toLowerCase(),
    canSendMail: canSendMail(plan),
    canExportDatev: canExportDatev(plan),
    angebote: {
      used: angeboteUsed,
      max,
      remaining: limited ? Math.max(0, FREE_DOCUMENT_LIMIT - angeboteUsed) : null,
    },
    rechnungen: {
      used: rechnungenUsed,
      max,
      remaining: limited ? Math.max(0, FREE_DOCUMENT_LIMIT - rechnungenUsed) : null,
    },
  };
}

export function createPlanLimitError(message, code) {
  const err = new Error(message);
  err.status = 403;
  err.code = code;
  return err;
}

export function assertCanCreateAngebot(tenantId, angebotId) {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM angebote WHERE tenant_id = ? AND id = ?')
    .get(tenantId, angebotId);
  if (existing) return;

  const tenant = getTenantById(tenantId);
  if (!isFreePlan(tenant?.plan)) return;

  const used = countDocuments('angebote', tenantId);
  if (used >= FREE_DOCUMENT_LIMIT) {
    throw createPlanLimitError(
      `Angebots-Limit erreicht (${FREE_DOCUMENT_LIMIT}/${FREE_DOCUMENT_LIMIT}). Bitte upgraden oder ein bestehendes Angebot bearbeiten.`,
      'PLAN_LIMIT_ANGEBOTE'
    );
  }
}

export function assertCanCreateRechnung(tenantId, rechnungId) {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM rechnungen WHERE tenant_id = ? AND id = ?')
    .get(tenantId, rechnungId);
  if (existing) return;

  const tenant = getTenantById(tenantId);
  if (!isFreePlan(tenant?.plan)) return;

  const used = countDocuments('rechnungen', tenantId);
  if (used >= FREE_DOCUMENT_LIMIT) {
    throw createPlanLimitError(
      `Rechnungs-Limit erreicht (${FREE_DOCUMENT_LIMIT}/${FREE_DOCUMENT_LIMIT}). Bitte upgraden oder eine bestehende Rechnung bearbeiten.`,
      'PLAN_LIMIT_RECHNUNGEN'
    );
  }
}

export function assertCanSendMail(tenantId) {
  const tenant = getTenantById(tenantId);
  if (canSendMail(tenant?.plan)) return;
  throw createPlanLimitError(
    'E-Mail-Versand ist ab dem Plus-Tarif verfügbar. Im Free-Tarif können Sie PDFs erstellen und speichern.',
    'PLAN_MAIL_LOCKED'
  );
}

export function assertCanExportDatev(tenantId) {
  const tenant = getTenantById(tenantId);
  if (canExportDatev(tenant?.plan)) return;
  throw createPlanLimitError(
    'DATEV-Export ist ab dem Plus-Tarif verfügbar.',
    'PLAN_DATEV_LOCKED'
  );
}
