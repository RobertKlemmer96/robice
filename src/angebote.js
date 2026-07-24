import { apiFetch } from './apiClient.js';

const API_BASE = '/api/angebote';

export async function getAllAngebote() {
  return apiFetch(API_BASE);
}

export async function getAngebot(id) {
  try {
    return await apiFetch(`${API_BASE}/${id}`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function saveAngebot(angebot) {
  return apiFetch(API_BASE, {
    method: 'POST',
    body: JSON.stringify(angebot),
  });
}

export async function deleteAngebot(id) {
  return apiFetch(`${API_BASE}/${id}`, { method: 'DELETE' });
}

export function createAngebotId() {
  return `ang_${Date.now()}`;
}

export async function fetchConfirmationLink(id) {
  return apiFetch(`${API_BASE}/${encodeURIComponent(id)}/confirmation-link`, {
    method: 'POST',
  });
}
