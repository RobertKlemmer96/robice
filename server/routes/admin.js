import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
  getAdminOverviewStats,
  getTenantById,
  getTenantOwnerEmail,
  listAllUsersWithStats,
} from '../services/authStore.js';
import { listAngebote } from '../repositories/angebote.js';
import { listRechnungen } from '../repositories/rechnungen.js';

function mapUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.user_created_at,
    tenant: {
      id: row.tenant_id,
      name: row.tenant_name,
      plan: row.tenant_plan,
      createdAt: row.tenant_created_at,
      onboardingCompleted: Boolean(row.tenant_onboarding_completed),
      stats: {
        kunden: row.kunden_count ?? 0,
        angebote: row.angebote_count ?? 0,
        rechnungen: row.rechnungen_count ?? 0,
        katalog: row.katalog_count ?? 0,
        lastActivityAt: row.last_activity_at || null,
      },
    },
  };
}

function summarizeDocuments(documents, { numberField, dateField }) {
  return documents.slice(0, 8).map((doc) => ({
    id: doc.id,
    number: doc[numberField],
    date: doc[dateField] || doc.erstelltAm,
    customer: doc.kunde?.name || '',
    updatedAt: doc.aktualisiertAm,
  }));
}

export function createAdminRouter() {
  const router = express.Router();

  router.get('/users', requireAdmin, (_req, res) => {
    try {
      const users = listAllUsersWithStats().map(mapUserRow);
      const overview = getAdminOverviewStats();
      res.json({
        users,
        total: users.length,
        overview: {
          users: overview.users,
          tenants: overview.tenants,
          angebote: overview.angebote,
          rechnungen: overview.rechnungen,
          kunden: overview.kunden,
          katalogPosten: overview.katalog_posten,
        },
      });
    } catch (err) {
      console.error('admin/users:', err);
      res.status(500).json({ error: 'Nutzerliste konnte nicht geladen werden.' });
    }
  });

  router.get('/tenants/:tenantId/documents', requireAdmin, (req, res) => {
    try {
      const tenant = getTenantById(req.params.tenantId);
      if (!tenant) {
        res.status(404).json({ error: 'Mandant nicht gefunden.' });
        return;
      }
      if (tenant.plan === 'admin') {
        res.status(403).json({ error: 'Admin-Mandant ist nicht zugänglich.' });
        return;
      }

      const angebote = listAngebote(tenant.id);
      const rechnungen = listRechnungen(tenant.id);

      res.json({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          plan: tenant.plan,
          ownerEmail: getTenantOwnerEmail(tenant.id),
        },
        angebote: summarizeDocuments(angebote, {
          numberField: 'angebotNr',
          dateField: 'angebotsdatum',
        }),
        rechnungen: summarizeDocuments(rechnungen, {
          numberField: 'rechnungNr',
          dateField: 'rechnungsdatum',
        }),
        totals: {
          angebote: angebote.length,
          rechnungen: rechnungen.length,
        },
      });
    } catch (err) {
      console.error('admin/tenants/documents:', err);
      res.status(500).json({ error: 'Dokumente konnten nicht geladen werden.' });
    }
  });

  router.post('/impersonate', requireAdmin, (req, res) => {
    try {
      const tenantId = String(req.body?.tenantId || '').trim();
      if (!tenantId) {
        res.status(400).json({ error: 'Mandant ist erforderlich.' });
        return;
      }

      const tenant = getTenantById(tenantId);
      if (!tenant) {
        res.status(404).json({ error: 'Mandant nicht gefunden.' });
        return;
      }
      if (tenant.plan === 'admin') {
        res.status(403).json({ error: 'Admin-Mandant kann nicht geöffnet werden.' });
        return;
      }

      req.session.impersonatedTenantId = tenantId;
      req.session.save((err) => {
        if (err) {
          console.error('admin/impersonate save:', err);
          res.status(500).json({ error: 'Account konnte nicht geöffnet werden.' });
          return;
        }
        res.json({
          ok: true,
          impersonation: {
            tenantId,
            tenantName: tenant.name,
            ownerEmail: getTenantOwnerEmail(tenantId),
          },
        });
      });
    } catch (err) {
      console.error('admin/impersonate:', err);
      res.status(500).json({ error: 'Account konnte nicht geöffnet werden.' });
    }
  });

  router.post('/impersonate/stop', requireAdmin, (req, res) => {
    try {
      delete req.session.impersonatedTenantId;
      req.session.save((err) => {
        if (err) {
          console.error('admin/impersonate/stop save:', err);
          res.status(500).json({ error: 'Impersonation konnte nicht beendet werden.' });
          return;
        }
        res.json({ ok: true });
      });
    } catch (err) {
      console.error('admin/impersonate/stop:', err);
      res.status(500).json({ error: 'Impersonation konnte nicht beendet werden.' });
    }
  });

  return router;
}
