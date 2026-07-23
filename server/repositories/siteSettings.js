import { getDb } from '../db/index.js';

const ALPHA_BANNER_KEY = 'alpha_banner_visible';

function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM site_settings WHERE key = ?').get(key);
  return row?.value ?? null;
}

function setSetting(key, value) {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(key, value, now);
}

export function isAlphaBannerVisible() {
  const stored = getSetting(ALPHA_BANNER_KEY);
  if (stored === null) return true;
  return stored === '1' || stored === 'true';
}

export function setAlphaBannerVisible(visible) {
  setSetting(ALPHA_BANNER_KEY, visible ? '1' : '0');
  return visible;
}

export function getPublicSiteSettings() {
  return {
    alphaBannerVisible: isAlphaBannerVisible(),
  };
}
