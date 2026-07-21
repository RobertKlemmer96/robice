import {
  findUserById,
  getTenantById,
  getTenantOwnerEmail,
  tenantToJson,
} from '../services/authStore.js';

export function resolveSessionUser(session) {
  if (!session?.userId || !session?.tenantId) return null;

  const user = findUserById(session.userId);
  if (!user) return null;

  const homeTenantId = session.tenantId;
  const impersonatedTenantId =
    user.role === 'admin' && session.impersonatedTenantId
      ? session.impersonatedTenantId
      : null;
  const effectiveTenantId = impersonatedTenantId || homeTenantId;

  return {
    user,
    homeTenantId,
    effectiveTenantId,
    impersonatedTenantId,
  };
}

export function attachResolvedSession(req) {
  const resolved = resolveSessionUser(req.session);
  if (!resolved) {
    req.userId = req.session?.userId ?? null;
    req.tenantId = req.session?.tenantId ?? null;
    req.homeTenantId = req.session?.tenantId ?? null;
    req.impersonatedTenantId = null;
    req.user = null;
    return null;
  }

  req.user = resolved.user;
  req.userId = resolved.user.id;
  req.tenantId = resolved.effectiveTenantId;
  req.homeTenantId = resolved.homeTenantId;
  req.impersonatedTenantId = resolved.impersonatedTenantId;
  return resolved;
}

export function requireAuth(req, res, next) {
  const resolved = attachResolvedSession(req);
  if (!resolved) {
    res.status(401).json({ error: 'Nicht angemeldet.' });
    return;
  }
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
  attachResolvedSession(req);
  next();
}

export function attachSessionUser(req, _res, next) {
  attachResolvedSession(req);
  next();
}

export function buildSessionPayload(session) {
  const resolved = resolveSessionUser(session);
  if (!resolved) return null;

  const tenant = getTenantById(resolved.effectiveTenantId);
  const payload = {
    user: {
      id: resolved.user.id,
      email: resolved.user.email,
      role: resolved.user.role,
    },
    tenant: tenantToJson(tenant),
  };

  if (resolved.impersonatedTenantId) {
    payload.impersonation = {
      tenantId: resolved.impersonatedTenantId,
      tenantName: tenant?.name || '',
      ownerEmail: getTenantOwnerEmail(resolved.impersonatedTenantId),
    };
  }

  return payload;
}
