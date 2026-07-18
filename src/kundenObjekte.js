import { apiFetch } from './apiClient.js';

function objekteUrl(kundeId) {
  return `/api/kunden/${encodeURIComponent(kundeId)}/objekte`;
}

export async function listKundenObjekte(kundeId) {
  return apiFetch(objekteUrl(kundeId));
}

export async function saveKundenObjekt(kundeId, objekt) {
  return apiFetch(objekteUrl(kundeId), {
    method: 'POST',
    body: JSON.stringify(objekt),
  });
}

export async function deleteKundenObjekt(kundeId, objektId) {
  return apiFetch(`${objekteUrl(kundeId)}/${encodeURIComponent(objektId)}`, {
    method: 'DELETE',
  });
}

export function createKundenObjektId() {
  return `objekt_${Date.now()}`;
}
