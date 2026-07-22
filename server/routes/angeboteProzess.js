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

  router.post('/:id/confirmation-link', requireAuth, (req, res) => {
    try {
      const angebot = angeboteRepo.getAngebot(req.tenantId, req.params.id);
      if (!angebot) {
        res.status(404).json({ error: 'Angebot nicht gefunden.' });
        return;
      }
      const token = angeboteRepo.ensureConfirmationToken(req.tenantId, req.params.id);
      const origin = String(req.headers.origin || '').trim();
      const baseUrl = origin || `${req.protocol}://${req.get('host')}`;
      res.json({
        token,
        url: `${baseUrl.replace(/\/$/, '')}/angebot/${token}`,
      });
    } catch (err) {
      console.error('confirmation-link:', err);
      res.status(500).json({ error: 'Bestätigungslink konnte nicht erzeugt werden.' });
    }
  });

  return router;
}
