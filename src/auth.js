import { apiFetch } from './apiClient.js';

const API_BASE = '/api/auth';

let cachedSession = null;

export async function refreshSession() {
  try {
    cachedSession = await apiFetch(`${API_BASE}/me`);
    return cachedSession;
  } catch {
    cachedSession = null;
    return null;
  }
}

export function isLoggedIn() {
  return cachedSession !== null;
}

export function getCurrentUser() {
  return cachedSession?.user?.email ?? null;
}

export function getCurrentTenant() {
  return cachedSession?.tenant ?? null;
}

export function getSession() {
  return cachedSession;
}

export function isAdmin() {
  return cachedSession?.user?.role === 'admin';
}

export function needsOnboarding() {
  if (!cachedSession) return false;
  return !cachedSession.tenant?.onboardingCompleted;
}

export async function markOnboardingComplete() {
  const data = await apiFetch(`${API_BASE}/tenant`, {
    method: 'PATCH',
    body: JSON.stringify({ completeOnboarding: true }),
  });
  if (cachedSession?.tenant && data?.tenant) {
    cachedSession = { ...cachedSession, tenant: data.tenant };
  }
  return data?.tenant;
}

export async function changePassword(currentPassword, newPassword) {
  await apiFetch(`${API_BASE}/change-password`, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function updateTenantName(name) {
  const data = await apiFetch(`${API_BASE}/tenant`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
  if (cachedSession?.tenant && data?.tenant) {
    cachedSession = { ...cachedSession, tenant: data.tenant };
  }
  return data.tenant;
}

export async function login(email, password) {
  cachedSession = await apiFetch(`${API_BASE}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return true;
}

export async function register(email, password, plan = 'free') {
  cachedSession = await apiFetch(`${API_BASE}/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password, plan }),
  });
  return true;
}

export async function logout() {
  try {
    await apiFetch(`${API_BASE}/logout`, { method: 'POST' });
  } finally {
    cachedSession = null;
  }
}

export async function deleteAccount(plz) {
  await apiFetch(`${API_BASE}/account/delete`, {
    method: 'POST',
    body: JSON.stringify({ plz }),
  });
  cachedSession = null;
}
