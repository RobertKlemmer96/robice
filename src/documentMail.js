import { apiFetch } from './apiClient.js';

export async function fetchMailStatus() {
  return apiFetch('/api/documents/mail-status');
}

export async function sendDocumentPdf(payload) {
  return apiFetch('/api/documents/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
