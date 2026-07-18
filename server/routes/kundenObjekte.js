import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as objekteRepo from '../repositories/kundenObjekte.js';

export function createKundenObjekteRouter() {
  const router = express.Router({ mergeParams: true });

  router.get('/:kundeId/objekte', requireAuth, (req, res) => {
    try {
      const objekte = objekteRepo.listObjekteForKunde(req.tenantId, req.params.kundeId);
      if (objekte === null) {
        res.status(404).json({ error: 'Kunde nicht gefunden.' });
        return;
      }
      res.json(objekte);
    } catch {
      res.status(500).json({ error: 'Objekte konnten nicht geladen werden.' });
    }
  });

  router.post('/:kundeId/objekte', requireAuth, (req, res) => {
    try {
      const objekt = req.body;
      if (!objekt?.id || !objekt?.name?.trim()) {
        res.status(400).json({ error: 'Ungültiges Objekt.' });
        return;
      }
      const saved = objekteRepo.saveObjekt(req.tenantId, req.params.kundeId, objekt);
      if (!saved) {
        res.status(404).json({ error: 'Kunde nicht gefunden.' });
        return;
      }
      res.json(saved);
    } catch {
      res.status(500).json({ error: 'Objekt konnte nicht gespeichert werden.' });
    }
  });

  router.delete('/:kundeId/objekte/:objektId', requireAuth, (req, res) => {
    try {
      const ok = objekteRepo.deleteObjekt(
        req.tenantId,
        req.params.kundeId,
        req.params.objektId
      );
      if (!ok) {
        res.status(404).json({ error: 'Objekt nicht gefunden.' });
        return;
      }
      res.status(204).end();
    } catch {
      res.status(500).json({ error: 'Objekt konnte nicht gelöscht werden.' });
    }
  });

  return router;
}
