const THEME_KEY = 'angebot_theme';
const DEFAULT_THEME = 'dark';

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function initTheme() {
  applyTheme(getTheme());
}
