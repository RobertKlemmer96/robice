import { apiFetch } from './apiClient.js';

export async function loadAdminUsers() {
  return apiFetch('/api/admin/users');
}

export async function loadAdminTenantDocuments(tenantId) {
  return apiFetch(`/api/admin/tenants/${encodeURIComponent(tenantId)}/documents`);
}

export async function startAdminImpersonation(tenantId) {
  return apiFetch('/api/admin/impersonate', {
    method: 'POST',
    body: JSON.stringify({ tenantId }),
  });
}

export async function stopAdminImpersonation() {
  return apiFetch('/api/admin/impersonate/stop', {
    method: 'POST',
  });
}
