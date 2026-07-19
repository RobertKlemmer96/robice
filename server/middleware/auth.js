import { findUserById } from '../services/authStore.js';

export function requireAuth(req, res, next) {
  if (!req.session?.userId || !req.session?.tenantId) {
    res.status(401).json({ error: 'Nicht angemeldet.' });
    return;
  }
  req.userId = req.session.userId;
  req.tenantId = req.session.tenantId;
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session?.userId) {
    res.status(401).json({ error: 'Nicht angemeldet.' });
    return;
  }
  const user = findUserById(req.session.userId);
  if (user?.role !== 'admin') {
    res.status(403).json({ error: 'Keine Berechtigung.' });
    return;
  }
  req.userId = req.session.userId;
  req.tenantId = req.session.tenantId;
  req.user = user;
  next();
}

export function attachSessionUser(req, _res, next) {
  req.tenantId = req.session?.tenantId ?? null;
  req.userId = req.session?.userId ?? null;
  next();
}
