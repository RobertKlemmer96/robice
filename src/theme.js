const THEME_KEY = 'angebot_theme';
const DEFAULT_THEME = 'dark';

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  updateToggleLabel(theme);
}

export function initTheme() {
  applyTheme(getTheme());
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

function updateToggleLabel(theme) {
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    const isDark = theme === 'dark';
    btn.setAttribute('aria-label', isDark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren');
    btn.title = isDark ? 'Hellmodus' : 'Dunkelmodus';
    const icon = btn.querySelector('.theme-icon');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
  });
}
