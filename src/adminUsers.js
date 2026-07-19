import { apiFetch } from './apiClient.js';

export async function loadAdminUsers() {
  return apiFetch('/api/admin/users');
}
