import express from 'express';
import { getPublicSiteSettings } from '../repositories/siteSettings.js';

export function createPublicSiteRouter() {
  const router = express.Router();

  router.get('/site-settings', (_req, res) => {
    try {
      res.json(getPublicSiteSettings());
    } catch (err) {
      console.error('public/site-settings:', err);
      res.status(500).json({ error: 'Einstellungen konnten nicht geladen werden.' });
    }
  });

  return router;
}
