import { apiFetch } from './apiClient.js';

const API_BASE = '/api/katalog-posten';

let cachedPosten = [];

export function getKatalogPosten() {
  return cachedPosten;
}

export function findKatalogPosten(id) {
  return cachedPosten.find((p) => p.id === id) ?? null;
}

export function setKatalogPostenCache(items) {
  cachedPosten = Array.isArray(items) ? items : [];
}

export async function loadKatalogPosten() {
  const items = await apiFetch(API_BASE);
  cachedPosten = items;
  return cachedPosten;
}

export async function getAllKatalogPosten() {
  return apiFetch(API_BASE);
}

export async function getKatalogPostenById(id) {
  try {
    return await apiFetch(`${API_BASE}/${id}`);
  } catch (err) {
    if (err.message === 'Katalog-Posten nicht gefunden.') return null;
    throw err;
  }
}

export async function saveKatalogPosten(posten) {
  const saved = await apiFetch(API_BASE, {
    method: 'POST',
    body: JSON.stringify(posten),
  });
  const idx = cachedPosten.findIndex((p) => p.id === saved.id);
  if (idx >= 0) cachedPosten[idx] = saved;
  else cachedPosten.push(saved);
  cachedPosten.sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, 'de'));
  return saved;
}

export async function deleteKatalogPosten(id) {
  await apiFetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  cachedPosten = cachedPosten.filter((p) => p.id !== id);
}

export function createKatalogPostenId() {
  return `kat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
