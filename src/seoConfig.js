/** Öffentliche Site-URL — bei Domain-Umzug hier anpassen; Sitemap wird via npm run sitemap:generate erzeugt. */
export const SEO_CONFIG = {
  siteUrl: 'https://robice.onrender.com',
  siteName: 'Quotavo',
  ogImagePath: '/quotavo-logo.svg',
};

export function getAbsoluteUrl(path = '/') {
  const base = SEO_CONFIG.siteUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
