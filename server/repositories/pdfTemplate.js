import { getDb } from '../db/index.js';
import {
  dehydrateTemplateImages,
  hydrateTemplateImages,
} from '../services/assets.js';

export async function getPdfTemplate(tenantId, defaultTemplate) {
  const db = getDb();
  const row = db
    .prepare('SELECT template_json FROM pdf_templates WHERE tenant_id = ?')
    .get(tenantId);

  if (!row) {
    return defaultTemplate ? structuredClone(defaultTemplate) : null;
  }

  let parsed;
  try {
    parsed = JSON.parse(row.template_json);
  } catch {
    return defaultTemplate ? structuredClone(defaultTemplate) : null;
  }

  return hydrateTemplateImages(tenantId, parsed);
}

export async function savePdfTemplate(tenantId, template) {
  const db = getDb();
  const stored = await dehydrateTemplateImages(tenantId, template);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO pdf_templates (tenant_id, template_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(tenant_id) DO UPDATE SET template_json = excluded.template_json, updated_at = excluded.updated_at`
  ).run(tenantId, JSON.stringify(stored), now);

  return hydrateTemplateImages(tenantId, stored);
}
