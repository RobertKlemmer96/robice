import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { listAllUsersWithTenants } from '../services/authStore.js';

export function createAdminRouter() {
  const router = express.Router();

  router.get('/users', requireAdmin, (_req, res) => {
    try {
      const users = listAllUsersWithTenants().map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        createdAt: row.user_created_at,
        tenant: {
          id: row.tenant_id,
          name: row.tenant_name,
          plan: row.tenant_plan,
          createdAt: row.tenant_created_at,
        },
      }));
      res.json({ users, total: users.length });
    } catch (err) {
      console.error('admin/users:', err);
      res.status(500).json({ error: 'Nutzerliste konnte nicht geladen werden.' });
    }
  });

  return router;
}
