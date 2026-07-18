import express from 'express';
import {
  createTenantWithOwner,
  findUserByEmail,
  findUserById,
  findUserAuthById,
  getTenantById,
  hashPassword,
  updateTenantName,
  updateUserPassword,
  verifyPassword,
} from '../services/authStore.js';

export function createAuthRouter({ sessionCookieName = 'angebot.sid' } = {}) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    try {
      const { tenantName, email, password } = req.body || {};
      if (!tenantName?.trim() || !email?.trim() || !password) {
        res.status(400).json({ error: 'Firma, E-Mail und Passwort sind erforderlich.' });
        return;
      }
      if (String(password).length < 8) {
        res.status(400).json({ error: 'Passwort mindestens 8 Zeichen.' });
        return;
      }
      if (findUserByEmail(email)) {
        res.status(409).json({ error: 'E-Mail ist bereits registriert.' });
        return;
      }

      const passwordHash = await hashPassword(password);
      const { tenantId, userId } = createTenantWithOwner({
        tenantName,
        email,
        passwordHash,
      });

      req.session.userId = userId;
      req.session.tenantId = tenantId;

      const tenant = getTenantById(tenantId);
      res.status(201).json({
        user: { id: userId, email: email.trim().toLowerCase(), role: 'owner' },
        tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan },
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
        tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan },
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
      tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan },
    });
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

      const { name } = req.body || {};
      if (!name?.trim()) {
        res.status(400).json({ error: 'Firmenname ist erforderlich.' });
        return;
      }

      updateTenantName(req.session.tenantId, name);
      const tenant = getTenantById(req.session.tenantId);
      res.json({
        tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan },
      });
    } catch (err) {
      console.error('tenant update:', err);
      res.status(500).json({ error: 'Firma konnte nicht gespeichert werden.' });
    }
  });

  return router;
}
