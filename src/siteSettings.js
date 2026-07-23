import { apiFetch } from './apiClient.js';

let alphaBannerVisible = true;

export function getAlphaBannerVisible() {
  return alphaBannerVisible;
}

export function applyAlphaBannerVisible(visible) {
  alphaBannerVisible = Boolean(visible);
  document.documentElement.dataset.alphaBanner = alphaBannerVisible ? 'shown' : 'hidden';
}

export async function loadPublicSiteSettings() {
  try {
    const data = await apiFetch('/api/public/site-settings');
    applyAlphaBannerVisible(data?.alphaBannerVisible !== false);
    return data;
  } catch {
    applyAlphaBannerVisible(true);
    return { alphaBannerVisible: true };
  }
}
