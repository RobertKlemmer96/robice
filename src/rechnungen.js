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

function uint8ToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function exportRechnungZugferdPdf(rechnung, postenDetails, pdfArrayBuffer) {
  const pdfBase64 = uint8ToBase64(new Uint8Array(pdfArrayBuffer));
  const res = await fetch('/api/rechnungen/export/zugferd', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rechnung, postenDetails, pdfBase64 }),
  });

  if (!res.ok) {
    let message = 'ZUGFeRD-Rechnung konnte nicht erstellt werden.';
    try {
      const payload = await res.json();
      if (payload?.error) message = payload.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.blob();
}
