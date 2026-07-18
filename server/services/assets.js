import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/s;

function tenantDir(tenantId) {
  return path.join(config.tenantAssetsDir, tenantId);
}

export async function ensureTenantAssetDir(tenantId) {
  await fs.mkdir(path.join(tenantDir(tenantId), 'assets'), { recursive: true });
}

function assetPath(tenantId, kind) {
  return path.join(tenantDir(tenantId), 'assets', `${kind}.bin`);
}

/** Base64 data-URL → Datei; gibt relativen Key zurück oder leeren String. */
export async function persistDataUrl(tenantId, kind, dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  if (!dataUrl.startsWith('data:')) return dataUrl;

  const match = dataUrl.match(DATA_URL_RE);
  if (!match) return '';

  await ensureTenantAssetDir(tenantId);
  const buf = Buffer.from(match[2], 'base64');
  await fs.writeFile(assetPath(tenantId, kind), buf);
  return `asset://${kind}`;
}

export async function loadAssetAsDataUrl(tenantId, ref) {
  if (!ref || typeof ref !== 'string') return '';
  if (ref.startsWith('data:')) return ref;
  if (!ref.startsWith('asset://')) return ref;

  const kind = ref.replace('asset://', '');
  try {
    const buf = await fs.readFile(assetPath(tenantId, kind));
    const ext = kind === 'logo' ? 'png' : 'png';
    const mime = ext === 'png' ? 'image/png' : 'application/octet-stream';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return '';
  }
}

export async function hydrateTemplateImages(tenantId, template) {
  if (!template?.bilder) return template;
  const bilder = { ...template.bilder };
  bilder.logo = await loadAssetAsDataUrl(tenantId, bilder.logo);
  bilder.header = await loadAssetAsDataUrl(tenantId, bilder.header);
  return { ...template, bilder };
}

export async function dehydrateTemplateImages(tenantId, template) {
  if (!template?.bilder) return template;
  const bilder = { ...template.bilder };
  bilder.logo = await persistDataUrl(tenantId, 'logo', bilder.logo);
  bilder.header = await persistDataUrl(tenantId, 'header', bilder.header);
  return { ...template, bilder };
}
