import express from 'express';
import {
  createTenantWithOwner,
  findUserByEmail,
  findUserById,
  findUserAuthById,
  getTenantById,
  completeTenantOnboarding,
  hashPassword,
  normalizeRegistrationPlan,
  tenantToJson,
  updateTenantName,
  updateUserPassword,
  verifyPassword,
  deleteTenantAccount,
  verifyTenantBillingPlz,
} from '../services/authStore.js';
import { config } from '../config.js';
import { savePdfTemplate } from '../repositories/pdfTemplate.js';
import { PDF_TEMPLATE_DEFAULT } from '../defaults/pdfTemplate.js';

export function createAuthRouter({ sessionCookieName = 'angebot.sid' } = {}) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    try {
      const { tenantName, email, password, plan } = req.body || {};
      if (!tenantName?.trim() || !email?.trim() || !password) {
        res.status(400).json({ error: 'Firma, E-Mail und Passwort sind erforderlich.' });
        return;
      }
      if (String(password).length < 8) {
        res.status(400).json({ error: 'Passwort mindestens 8 Zeichen.' });
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail === config.adminEmail.toLowerCase()) {
        res.status(403).json({ error: 'Diese E-Mail ist reserviert.' });
        return;
      }
      if (findUserByEmail(email)) {
        res.status(409).json({ error: 'E-Mail ist bereits registriert.' });
        return;
      }

      const passwordHash = await hashPassword(password);
      const { tenantId, userId, email: registeredEmail } = createTenantWithOwner({
        tenantName,
        email,
        passwordHash,
        plan: normalizeRegistrationPlan(plan),
      });

      await savePdfTemplate(tenantId, {
        ...PDF_TEMPLATE_DEFAULT,
        firma: {
          ...PDF_TEMPLATE_DEFAULT.firma,
          name: tenantName.trim(),
          email: registeredEmail,
        },
      });

      req.session.userId = userId;
      req.session.tenantId = tenantId;

      const tenant = getTenantById(tenantId);
      res.status(201).json({
        user: { id: userId, email: registeredEmail, role: 'owner' },
        tenant: tenantToJson(tenant),
      });
    } catch (err) {
      console.error('register:', err);
      res.status(500).json({ error: 'Registrierung fehlgeschlagen.' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const loginId = (email || req.body?.username || '').trim().toLowerCase();
      if (!loginId || !password) {
        res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });
        return;
      }

      let user = findUserByEmail(loginId);
      if (!user && !loginId.includes('@')) {
        user = findUserByEmail(`${loginId}@local`);
      }
      if (!user || !(await verifyPassword(password, user.password_hash))) {
        res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
        return;
      }

      req.session.userId = user.id;
      req.session.tenantId = user.tenant_id;

      const tenant = getTenantById(user.tenant_id);
      res.json({
        user: { id: user.id, email: user.email, role: user.role },
        tenant: tenantToJson(tenant),
      });
    } catch (err) {
      console.error('login:', err);
      res.status(500).json({ error: 'Anmeldung fehlgeschlagen.' });
    }
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie(sessionCookieName);
      res.status(204).end();
    });
  });

  router.get('/me', (req, res) => {
    if (!req.session?.userId) {
      res.status(401).json({ error: 'Nicht angemeldet.' });
      return;
    }
    const user = findUserById(req.session.userId);
    if (!user) {
      res.status(401).json({ error: 'Nicht angemeldet.' });
      return;
    }
    const tenant = getTenantById(user.tenant_id);
    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      tenant: tenantToJson(tenant),
    });
  });

  router.patch('/onboarding', (req, res) => {
    completeOnboardingHandler(req, res);
  });

  router.post('/onboarding/complete', (req, res) => {
    completeOnboardingHandler(req, res);
  });

  router.post('/account/delete', async (req, res) => {
    try {
      if (!req.session?.tenantId || !req.session?.userId) {
        res.status(401).json({ error: 'Nicht angemeldet.' });
        return;
      }

      const { plz } = req.body || {};
      if (!plz?.trim()) {
        res.status(400).json({ error: 'Bitte geben Sie Ihre Postleitzahl zur Bestätigung ein.' });
        return;
      }

      const tenant = getTenantById(req.session.tenantId);
      if (tenant?.plan === 'admin') {
        res.status(403).json({ error: 'Dieses Konto kann nicht gelöscht werden.' });
        return;
      }

      const plzOk = await verifyTenantBillingPlz(req.session.tenantId, plz);
      if (!plzOk) {
        res.status(400).json({
          error: 'Die Postleitzahl stimmt nicht mit Ihrer hinterlegten Rechnungsadresse überein.',
        });
        return;
      }

      await deleteTenantAccount(req.session.tenantId);
      req.session.destroy(() => {
        res.clearCookie(sessionCookieName);
        res.status(204).end();
      });
    } catch (err) {
      console.error('account/delete:', err);
      res.status(500).json({ error: err.message || 'Konto konnte nicht gelöscht werden.' });
    }
  });

  router.post('/change-password', async (req, res) => {
    try {
      if (!req.session?.userId) {
        res.status(401).json({ error: 'Nicht angemeldet.' });
        return;
      }

      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich.' });
        return;
      }
      if (String(newPassword).length < 8) {
        res.status(400).json({ error: 'Neues Passwort mindestens 8 Zeichen.' });
        return;
      }

      const user = findUserAuthById(req.session.userId);
      if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
        res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' });
        return;
      }

      const passwordHash = await hashPassword(newPassword);
      updateUserPassword(user.id, passwordHash);
      res.json({ ok: true });
    } catch (err) {
      console.error('change-password:', err);
      res.status(500).json({ error: 'Passwort konnte nicht geändert werden.' });
    }
  });

  router.patch('/tenant', (req, res) => {
    try {
      if (!req.session?.tenantId) {
        res.status(401).json({ error: 'Nicht angemeldet.' });
        return;
      }

      const { name, completeOnboarding } = req.body || {};
      const shouldCompleteOnboarding =
        completeOnboarding === true || req.body?.completed === true;

      if (shouldCompleteOnboarding) {
        completeTenantOnboarding(req.session.tenantId);
      }

      if (name?.trim()) {
        updateTenantName(req.session.tenantId, name);
      }

      if (!shouldCompleteOnboarding && !name?.trim()) {
        res.status(400).json({ error: 'Ungültige Anfrage.' });
        return;
      }

      const tenant = getTenantById(req.session.tenantId);
      res.json({
        tenant: tenantToJson(tenant),
      });
    } catch (err) {
      console.error('tenant update:', err);
      res.status(500).json({ error: 'Firma konnte nicht gespeichert werden.' });
    }
  });

  return router;
}

function completeOnboardingHandler(req, res) {
  try {
    if (!req.session?.tenantId) {
      res.status(401).json({ error: 'Nicht angemeldet.' });
      return;
    }
    if (req.body?.completed !== true && req.body?.completeOnboarding !== true) {
      res.status(400).json({ error: 'Ungültige Anfrage.' });
      return;
    }
    completeTenantOnboarding(req.session.tenantId);
    const tenant = getTenantById(req.session.tenantId);
    res.json({ tenant: tenantToJson(tenant) });
  } catch (err) {
    console.error('onboarding:', err);
    res.status(500).json({ error: 'Einrichtung konnte nicht abgeschlossen werden.' });
  }
}
