import express from 'express';
import * as angeboteRepo from '../repositories/angebote.js';
import { getPdfTemplate } from '../repositories/pdfTemplate.js';
import { getTenantById } from '../services/authStore.js';
import { PDF_TEMPLATE_DEFAULT } from '../defaults/pdfTemplate.js';

export function createPublicAngeboteRouter() {
  const router = express.Router();

  router.get('/:token', async (req, res) => {
    try {
      const angebot = angeboteRepo.getAngebotByConfirmationToken(req.params.token);
      if (!angebot) {
        res.status(404).json({ error: 'Angebot nicht gefunden oder Link ungültig.' });
        return;
      }

      const tenant = getTenantById(angebot.tenantId);
      const template = await getPdfTemplate(angebot.tenantId, PDF_TEMPLATE_DEFAULT);
      const firmaName = template?.firma?.name || tenant?.name || 'Anbieter';
      const status = angebot.prozessStatus;
      const alreadyResponded = status === 'bestaetigt' || status === 'abgelehnt';

      res.json({
        angebotNr: angebot.angebotNr,
        firmaName,
        kundeName: angebot.kunde?.name || '',
        gueltigBis: angebot.gueltigBis || null,
        prozessStatus: status,
        alreadyResponded,
        decision: alreadyResponded ? status : null,
      });
    } catch (err) {
      console.error('public angebot get:', err);
      res.status(500).json({ error: 'Angebot konnte nicht geladen werden.' });
    }
  });

  router.post('/:token/verify-plz', (req, res) => {
    try {
      const { plz } = req.body || {};
      const result = angeboteRepo.verifyAngebotConfirmationPlz(req.params.token, plz);

      if (result.error === 'NOT_FOUND') {
        res.status(404).json({ error: 'Angebot nicht gefunden oder Link ungültig.' });
        return;
      }
      if (result.error === 'INVALID_PLZ') {
        res.status(403).json({ error: 'Postleitzahl stimmt nicht mit dem Angebot überein.' });
        return;
      }
      if (result.error === 'ALREADY_RESPONDED') {
        res.status(409).json({
          error: 'Zu diesem Angebot wurde bereits geantwortet.',
          decision: result.angebot?.prozessStatus,
        });
        return;
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('public angebot verify-plz:', err);
      res.status(500).json({ error: 'Postleitzahl konnte nicht geprüft werden.' });
    }
  });

  router.post('/:token/respond', (req, res) => {
    try {
      const { plz, decision } = req.body || {};
      const normalizedDecision = String(decision || '').trim().toLowerCase();
      if (normalizedDecision !== 'bestaetigt' && normalizedDecision !== 'abgelehnt') {
        res.status(400).json({ error: 'Ungültige Entscheidung.' });
        return;
      }

      const result = angeboteRepo.respondToAngebotConfirmation(
        req.params.token,
        plz,
        normalizedDecision
      );

      if (result.error === 'NOT_FOUND') {
        res.status(404).json({ error: 'Angebot nicht gefunden oder Link ungültig.' });
        return;
      }
      if (result.error === 'INVALID_PLZ') {
        res.status(403).json({ error: 'Postleitzahl stimmt nicht mit dem Angebot überein.' });
        return;
      }
      if (result.error === 'ALREADY_RESPONDED') {
        res.status(409).json({
          error: 'Zu diesem Angebot wurde bereits geantwortet.',
          decision: result.angebot?.prozessStatus,
        });
        return;
      }

      res.json({
        ok: true,
        decision: result.decision,
        angebotNr: result.angebot?.angebotNr,
      });
    } catch (err) {
      console.error('public angebot respond:', err);
      res.status(500).json({ error: 'Antwort konnte nicht gespeichert werden.' });
    }
  });

  return router;
}
