import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as angeboteRepo from '../repositories/angebote.js';

export function createAngeboteProzessRouter() {
  const router = express.Router();

  router.patch('/:id/prozess-status', requireAuth, (req, res) => {
    try {
      const { prozessStatus } = req.body ?? {};
      const updated = angeboteRepo.updateAngebotProzessStatus(
        req.tenantId,
        req.params.id,
        prozessStatus
      );
      if (!updated) {
        res.status(404).json({ error: 'Angebot nicht gefunden.' });
        return;
      }
      res.json(updated);
    } catch (err) {
      if (err?.code === 'INVALID_PROZESS_STATUS') {
        res.status(400).json({ error: 'Ungültiger Prozess-Status.' });
        return;
      }
      res.status(500).json({ error: 'Status konnte nicht gespeichert werden.' });
    }
  });

  return router;
}
