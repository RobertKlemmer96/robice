import { apiFetch } from './apiClient.js';

const API_BASE = '/api/kunden';

export async function getAllKunden() {
  return apiFetch(API_BASE);
}

export async function getKunde(id) {
  try {
    return await apiFetch(`${API_BASE}/${id}`);
  } catch (err) {
    if (err.message === 'Kunde nicht gefunden.') return null;
    throw err;
  }
}

export async function saveKunde(kunde) {
  return apiFetch(API_BASE, {
    method: 'POST',
    body: JSON.stringify(kunde),
  });
}

export async function deleteKunde(id) {
  return apiFetch(`${API_BASE}/${id}`, { method: 'DELETE' });
}

export function createKundeId() {
  return `kunde_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
