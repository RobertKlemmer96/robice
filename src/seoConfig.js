/** Öffentliche Site-URL — bei Domain-Umzug hier und in public/sitemap.xml anpassen. */
export const SEO_CONFIG = {
  siteUrl: 'https://robice.onrender.com',
  siteName: 'KlemDesk',
  ogImagePath: '/klemdesk-logo.svg',
};

export function getAbsoluteUrl(path = '/') {
  const base = SEO_CONFIG.siteUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
