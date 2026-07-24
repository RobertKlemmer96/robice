/** Öffentliche, indexierbare Pfade (Slug → interne Seiten-ID). */
export const LEGAL_PATH_TO_PAGE = {
  impressum: 'impressum',
  datenschutz: 'datenschutz',
  agb: 'agb',
  handbuch: 'handbook',
  faq: 'faq',
  roadmap: 'roadmap',
};

export const GUIDE_PATHS = new Set([
  'angebot-erstellen',
  'rechnung-schreiben',
  'angebot-handwerker',
  'angebot-online-bestaetigen',
  'sevdesk-alternative',
]);

export const HUB_PATH = 'ressourcen';

export const PUBLIC_PATHS = [
  ...Object.keys(LEGAL_PATH_TO_PAGE),
  ...GUIDE_PATHS,
  HUB_PATH,
];

export function getPathForLegalPage(pageId) {
  const entry = Object.entries(LEGAL_PATH_TO_PAGE).find(([, id]) => id === pageId);
  return entry ? `/${entry[0]}` : null;
}

export function getPathForGuide(slug) {
  return GUIDE_PATHS.has(slug) ? `/${slug}` : null;
}

export function parsePublicPath(pathname = window.location.pathname) {
  const normalized = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (normalized === '/') return null;

  const slug = normalized.slice(1).toLowerCase();
  if (LEGAL_PATH_TO_PAGE[slug]) {
    return { kind: 'legal', pageId: LEGAL_PATH_TO_PAGE[slug], path: `/${slug}` };
  }
  if (GUIDE_PATHS.has(slug)) {
    return { kind: 'guide', slug, path: `/${slug}` };
  }
  if (slug === HUB_PATH) {
    return { kind: 'hub', path: `/${HUB_PATH}` };
  }
  return null;
}
