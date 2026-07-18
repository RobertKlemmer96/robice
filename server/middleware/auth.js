export function requireAuth(req, res, next) {
  if (!req.session?.userId || !req.session?.tenantId) {
    res.status(401).json({ error: 'Nicht angemeldet.' });
    return;
  }
  req.userId = req.session.userId;
  req.tenantId = req.session.tenantId;
  next();
}

export function attachSessionUser(req, _res, next) {
  req.tenantId = req.session?.tenantId ?? null;
  req.userId = req.session?.userId ?? null;
  next();
}
