import { SEO_CONFIG, getAbsoluteUrl } from './seoConfig.js';

const OG_LOCALE = {
  de: 'de_DE',
  en: 'en_GB',
};

function setMetaByName(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setMetaByProperty(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkRel(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function renderStructuredData({ locale, description }) {
  let el = document.getElementById('seo-structured-data');
  if (!el) {
    el = document.createElement('script');
    el.id = 'seo-structured-data';
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }

  const payload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${getAbsoluteUrl('/')}#website`,
        url: getAbsoluteUrl('/'),
        name: SEO_CONFIG.siteName,
        description,
        inLanguage: locale,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${getAbsoluteUrl('/')}#app`,
        name: SEO_CONFIG.siteName,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: getAbsoluteUrl('/'),
        description,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${getAbsoluteUrl('/')}#organization`,
        name: SEO_CONFIG.siteName,
        url: getAbsoluteUrl('/'),
      },
    ],
  };

  el.textContent = JSON.stringify(payload);
}

export function applySeoMeta({
  locale = 'de',
  title,
  description,
  ogTitle,
  keywords,
  author,
}) {
  const pageUrl = getAbsoluteUrl('/');
  const imageUrl = getAbsoluteUrl(SEO_CONFIG.ogImagePath);

  document.title = title;

  setMetaByName('description', description);
  setMetaByName('keywords', keywords);
  setMetaByName('author', author);
  setMetaByName('application-name', SEO_CONFIG.siteName);
  setMetaByName('twitter:card', 'summary');
  setMetaByName('twitter:title', ogTitle);
  setMetaByName('twitter:description', description);
  setMetaByName('twitter:image', imageUrl);

  setMetaByProperty('og:type', 'website');
  setMetaByProperty('og:site_name', SEO_CONFIG.siteName);
  setMetaByProperty('og:url', pageUrl);
  setMetaByProperty('og:title', ogTitle);
  setMetaByProperty('og:description', description);
  setMetaByProperty('og:locale', OG_LOCALE[locale] || OG_LOCALE.de);
  setMetaByProperty('og:image', imageUrl);

  setLinkRel('canonical', pageUrl);

  renderStructuredData({ locale, description });
}
