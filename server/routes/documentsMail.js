import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { findUserById } from '../services/authStore.js';
import { sendDocumentEmail, getMailStatus } from '../services/mail.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createDocumentsMailRouter() {
  const router = express.Router();

  router.get('/mail-status', requireAuth, (_req, res) => {
    res.json(getMailStatus());
  });

  router.post('/send', requireAuth, async (req, res) => {
    try {
      const { to, subject, text, filename, pdfBase64, type } = req.body || {};
      const recipient = String(to || '').trim().toLowerCase();

      if (!recipient || !EMAIL_RE.test(recipient)) {
        res.status(400).json({ error: 'Gültige Kunden-E-Mail ist erforderlich.' });
        return;
      }
      if (!subject?.trim() || !text?.trim()) {
        res.status(400).json({ error: 'Betreff und Nachricht sind erforderlich.' });
        return;
      }
      if (!filename?.trim() || !pdfBase64) {
        res.status(400).json({ error: 'PDF-Anhang fehlt.' });
        return;
      }
      if (type !== 'angebot' && type !== 'rechnung') {
        res.status(400).json({ error: 'Ungültiger Dokumenttyp.' });
        return;
      }

      const user = findUserById(req.userId);
      const bccCandidate = String(user?.email || '').trim().toLowerCase();
      const bcc = EMAIL_RE.test(bccCandidate) ? bccCandidate : undefined;

      let pdfBuffer;
      try {
        pdfBuffer = Buffer.from(String(pdfBase64), 'base64');
      } catch {
        res.status(400).json({ error: 'PDF-Daten sind ungültig.' });
        return;
      }

      if (!pdfBuffer.length) {
        res.status(400).json({ error: 'PDF-Daten sind leer.' });
        return;
      }

      const mailResult = await sendDocumentEmail({
        to: recipient,
        bcc,
        subject: subject.trim(),
        text: text.trim(),
        filename: filename.trim(),
        pdfBuffer,
      });

      res.json({
        ok: true,
        to: recipient,
        bcc: bcc || null,
        previewUrl: mailResult.previewUrl,
      });
    } catch (err) {
      console.error('documents/send:', err);
      res.status(500).json({ error: err.message || 'E-Mail konnte nicht gesendet werden.' });
    }
  });

  return router;
}
