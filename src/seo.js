import { SEO_CONFIG, getAbsoluteUrl } from './seoConfig.js';
import { FAQ } from './faqConfig.js';
import { HANDBOOK } from './handbookConfig.js';
import { getGuideHowToSteps } from './seoGuides.js';

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

function buildFaqSchema(pageUrl) {
  return {
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: FAQ.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

function buildHandbookSchema(pageUrl, description) {
  const steps = HANDBOOK.sections.flatMap((section) =>
    section.steps.map((text) => ({
      '@type': 'HowToStep',
      name: section.title,
      text,
    }))
  );

  return {
    '@type': ['Article', 'HowTo'],
    '@id': `${pageUrl}#handbook`,
    headline: 'Quotavo Handbuch',
    description,
    dateModified: HANDBOOK.lastUpdated,
    step: steps,
  };
}

function buildGuideSchema(pageUrl, slug, title, description) {
  const stepTexts = getGuideHowToSteps(slug);
  if (!stepTexts.length) {
    return {
      '@type': 'Article',
      '@id': `${pageUrl}#article`,
      headline: title,
      description,
    };
  }

  return {
    '@type': ['Article', 'HowTo'],
    '@id': `${pageUrl}#guide`,
    headline: title,
    description,
    step: stepTexts.map((text, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text,
    })),
  };
}

function renderStructuredData({ locale, description, pagePath = '/', schema, pageTitle }) {
  let el = document.getElementById('seo-structured-data');
  if (!el) {
    el = document.createElement('script');
    el.id = 'seo-structured-data';
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }

  const pageUrl = getAbsoluteUrl(pagePath);
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${getAbsoluteUrl('/')}#website`,
      url: getAbsoluteUrl('/'),
      name: SEO_CONFIG.siteName,
      description,
      inLanguage: locale,
    },
    {
      '@type': 'Organization',
      '@id': `${getAbsoluteUrl('/')}#organization`,
      name: SEO_CONFIG.siteName,
      url: getAbsoluteUrl('/'),
    },
  ];

  if (pagePath === '/') {
    graph.push({
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
    });
  } else {
    graph.push({
      '@type': 'WebPage',
      '@id': `${pageUrl}#webpage`,
      url: pageUrl,
      name: pageTitle || SEO_CONFIG.siteName,
      description,
      isPartOf: { '@id': `${getAbsoluteUrl('/')}#website` },
      inLanguage: locale,
    });
  }

  if (schema === 'faq') graph.push(buildFaqSchema(pageUrl));
  if (schema === 'handbook') graph.push(buildHandbookSchema(pageUrl, description));
  if (schema?.startsWith('guide-')) {
    const slug = pagePath.replace(/^\//, '');
    graph.push(buildGuideSchema(pageUrl, slug, pageTitle, description));
  }

  el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

export function applySeoMeta({
  locale = 'de',
  title,
  description,
  ogTitle,
  keywords,
  author,
  pagePath = '/',
  schema = null,
}) {
  const pageUrl = getAbsoluteUrl(pagePath);
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

  setMetaByProperty('og:type', pagePath === '/' ? 'website' : 'article');
  setMetaByProperty('og:site_name', SEO_CONFIG.siteName);
  setMetaByProperty('og:url', pageUrl);
  setMetaByProperty('og:title', ogTitle);
  setMetaByProperty('og:description', description);
  setMetaByProperty('og:locale', OG_LOCALE[locale] || OG_LOCALE.de);
  setMetaByProperty('og:image', imageUrl);

  setLinkRel('canonical', pageUrl);

  renderStructuredData({
    locale,
    description,
    pagePath,
    schema,
    pageTitle: title,
  });
}

export function applyPublicPageSeo(seoConfig, locale = 'de') {
  if (!seoConfig) return;
  applySeoMeta({
    locale,
    title: seoConfig.title,
    description: seoConfig.description,
    ogTitle: seoConfig.ogTitle,
    keywords: seoConfig.keywords,
    author: 'Robert Klemmer',
    pagePath: seoConfig.path,
    schema: seoConfig.schema || null,
  });
}
