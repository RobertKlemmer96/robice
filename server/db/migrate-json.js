import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import {
  ensureDefaultTenantAdmin,
  hashPassword,
} from '../services/authStore.js';
import * as kundenRepo from '../repositories/kunden.js';
import * as angeboteRepo from '../repositories/angebote.js';
import * as rechnungenRepo from '../repositories/rechnungen.js';
import { savePdfTemplate } from '../repositories/pdfTemplate.js';

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return data ?? fallback;
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

function hasLegacyJsonData(kunden, angebote, rechnungen, template) {
  return (
    (Array.isArray(kunden) && kunden.length > 0) ||
    (Array.isArray(angebote) && angebote.length > 0) ||
    (Array.isArray(rechnungen) && rechnungen.length > 0) ||
    (template && typeof template === 'object' && Object.keys(template).length > 0)
  );
}

export async function runStartupMigrations(defaultPdfTemplate) {
  getDb();

  const passwordHash = await hashPassword(config.adminPassword);
  let tenantInfo = ensureDefaultTenantAdmin(passwordHash);

  const db = getDb();
  if (!tenantInfo) {
    const owner = db.prepare('SELECT tenant_id FROM users LIMIT 1').get();
    if (!owner) return;
    tenantInfo = { tenantId: owner.tenant_id };
  }

  const { tenantId } = tenantInfo;
  const imported = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM kunden WHERE tenant_id = ?) +
        (SELECT COUNT(*) FROM angebote WHERE tenant_id = ?) +
        (SELECT COUNT(*) FROM rechnungen WHERE tenant_id = ?) AS c`
    )
    .get(tenantId, tenantId, tenantId);
  if (imported.c > 0) return;

  const legacyDir = config.legacyDataDir;
  const kunden = await readJsonFile(path.join(legacyDir, 'kunden.json'), []);
  const angebote = await readJsonFile(path.join(legacyDir, 'angebote.json'), []);
  const rechnungen = await readJsonFile(path.join(legacyDir, 'rechnungen.json'), []);
  const template = await readJsonFile(path.join(legacyDir, 'pdf-template.json'), null);

  if (!hasLegacyJsonData(kunden, angebote, rechnungen, template)) return;

  console.log(`Importiere Legacy-JSON in Mandant ${tenantId}…`);

  if (Array.isArray(kunden)) {
    for (const k of kunden) {
      if (!k?.id) continue;
      kundenRepo.saveKunde(tenantId, {
        id: k.id,
        name: k.name || '',
        adresse: k.adresse || '',
        telefon: k.telefon || '',
        email: k.email || '',
        notiz: k.notiz || '',
        erstelltAm: k.erstelltAm || new Date().toISOString(),
        aktualisiertAm: k.aktualisiertAm || k.erstelltAm || new Date().toISOString(),
      });
    }
  }

  if (Array.isArray(angebote)) {
    for (const a of angebote) {
      if (!a?.id) continue;
      angeboteRepo.saveAngebot(tenantId, a);
    }
  }

  if (Array.isArray(rechnungen)) {
    for (const r of rechnungen) {
      if (!r?.id) continue;
      rechnungenRepo.saveRechnung(tenantId, r);
    }
  }

  if (template && typeof template === 'object') {
    const merged = { ...defaultPdfTemplate, ...template };
    await savePdfTemplate(tenantId, merged);
  }

  console.log('Legacy-Import abgeschlossen.');
}
