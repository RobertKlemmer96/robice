import { apiFetch } from './apiClient.js';

const API_BASE = '/api/rechnungen';

export async function getAllRechnungen() {
  return apiFetch(API_BASE);
}

export async function getRechnung(id) {
  try {
    return await apiFetch(`${API_BASE}/${id}`);
  } catch (err) {
    if (err.message === 'Rechnung nicht gefunden.') return null;
    throw err;
  }
}

export async function saveRechnung(rechnung) {
  return apiFetch(API_BASE, {
    method: 'POST',
    body: JSON.stringify(rechnung),
  });
}

export async function deleteRechnung(id) {
  return apiFetch(`${API_BASE}/${id}`, { method: 'DELETE' });
}

export function createRechnungId() {
  return `rechn_${Date.now()}`;
}
