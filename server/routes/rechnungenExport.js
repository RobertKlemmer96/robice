import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPdfTemplate } from '../repositories/pdfTemplate.js';
import { PDF_TEMPLATE_DEFAULT } from '../defaults/pdfTemplate.js';
import { embedZugferdInPdf } from '../services/zugferdExport.js';
import { buildDatevCsv } from '../services/datevExport.js';
import { assertCanExportDatev } from '../services/planLimits.js';
import * as rechnungenRepo from '../repositories/rechnungen.js';

export function createRechnungenExportRouter() {
  const router = express.Router();

  router.post('/export/zugferd', requireAuth, async (req, res) => {
    try {
      const { rechnung, postenDetails, pdfBase64 } = req.body || {};

      if (!rechnung || !pdfBase64) {
        res.status(400).json({ error: 'Rechnung und PDF-Daten sind erforderlich.' });
        return;
      }

      let pdfBuffer;
      try {
        pdfBuffer = Buffer.from(String(pdfBase64), 'base64');
      } catch {
        res.status(400).json({ error: 'Ungültiges PDF-Format.' });
        return;
      }

      if (!pdfBuffer.length) {
        res.status(400).json({ error: 'PDF ist leer.' });
        return;
      }

      const template = await getPdfTemplate(req.tenantId, PDF_TEMPLATE_DEFAULT);
      const { pdf, profile } = await embedZugferdInPdf(
        pdfBuffer,
        rechnung,
        postenDetails || [],
        template
      );

      const safeNr = String(rechnung.rechnungNr || 'Rechnung').replace(/[^a-zA-Z0-9-]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Rechnung_${safeNr}_ZUGFeRD.pdf"`);
      res.setHeader('X-ZUGFeRD-Profile', profile || 'EN16931');
      res.send(pdf);
    } catch (err) {
      console.error('zugferd export:', err);
      res.status(400).json({
        error: err.message || 'ZUGFeRD-Rechnung konnte nicht erstellt werden.',
      });
    }
  });

  router.post('/export/datev', requireAuth, async (req, res) => {
    try {
      assertCanExportDatev(req.tenantId);

      const { von, bis } = req.body || {};
      if (!von || !bis) {
        res.status(400).json({ error: 'Zeitraum (von/bis) ist erforderlich.' });
        return;
      }

      const template = await getPdfTemplate(req.tenantId, PDF_TEMPLATE_DEFAULT);
      const rechnungen = rechnungenRepo.listRechnungen(req.tenantId);
      const { buffer, count } = buildDatevCsv(rechnungen, template.datev || {}, { von, bis });

      const monthLabel = String(von).slice(0, 7).replace('-', '_');
      res.setHeader('Content-Type', 'text/csv; charset=ISO-8859-1');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="EXTF_Buchungsstapel_${monthLabel}.csv"`
      );
      res.setHeader('X-DATEV-Export-Count', String(count));
      res.send(buffer);
    } catch (err) {
      if (err.status === 403) {
        res.status(403).json({ error: err.message, code: err.code });
        return;
      }
      if (err.status === 400) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error('datev export:', err);
      res.status(500).json({ error: 'DATEV-Export konnte nicht erstellt werden.' });
    }
  });

  return router;
}
