import { apiFetch } from './apiClient.js';

export async function fetchMailStatus() {
  return apiFetch('/api/documents/mail-status');
}

export async function sendDocumentPdf(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  try {
    return await apiFetch('/api/documents/send', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('E-Mail-Versand hat zu lange gedauert. Bitte später erneut versuchen.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
