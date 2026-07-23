import express from 'express';
import { requireAuth } from '../middleware/auth.js';

export function createEntityRouter({ label, list, get, save, remove, idField = 'id' }) {
  const router = express.Router();
  const singular = label.endsWith('e') ? label.slice(0, -1) : label;

  router.get('/', requireAuth, (req, res) => {
    try {
      res.json(list(req.tenantId));
    } catch {
      res.status(500).json({ error: `${label} konnten nicht geladen werden.` });
    }
  });

  router.get('/:id', requireAuth, (req, res) => {
    try {
      const item = get(req.tenantId, req.params.id);
      if (!item) {
        res.status(404).json({ error: `${singular} nicht gefunden.` });
        return;
      }
      res.json(item);
    } catch {
      res.status(500).json({ error: `${singular} konnte nicht geladen werden.` });
    }
  });

  router.post('/', requireAuth, (req, res) => {
    try {
      const item = req.body;
      if (!item?.[idField]) {
        res.status(400).json({ error: `Ungültiger ${singular}.` });
        return;
      }
      res.json(save(req.tenantId, item));
    } catch (err) {
      if (err.status === 403) {
        res.status(403).json({ error: err.message, code: err.code || 'PLAN_LIMIT' });
        return;
      }
      console.error(`${label} save:`, err);
      res.status(500).json({ error: `${singular} konnte nicht gespeichert werden.` });
    }
  });

  router.delete('/:id', requireAuth, (req, res) => {
    try {
      const ok = remove(req.tenantId, req.params.id);
      if (!ok) {
        res.status(404).json({ error: `${singular} nicht gefunden.` });
        return;
      }
      res.status(204).end();
    } catch {
      res.status(500).json({ error: `${singular} konnte nicht gelöscht werden.` });
    }
  });

  return router;
}
