import { SEO_GUIDES, SEO_HUB } from './seoGuidesConfig.js';
import { LEGAL_CONFIG } from './legalConfig.js';
import { getAbsoluteUrl } from './seoConfig.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderRelatedLinks(links = []) {
  if (!links.length) return '';
  return `
    <nav class="seo-related" aria-label="Weiterführende Seiten">
      <h2 class="seo-related__title">Das könnte Sie auch interessieren</h2>
      <ul class="seo-related__list">
        ${links
          .map(
            (link) =>
              `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`
          )
          .join('')}
      </ul>
    </nav>`;
}

function renderGuideCta() {
  return `
    <section class="seo-cta">
      <h2>Jetzt kostenlos testen</h2>
      <p>Registrierung dauert unter einer Minute — eigener Mandant, getrennte Daten, PDF sofort nutzbar.</p>
      <p><a href="/" class="btn btn-primary btn-sm">Zur Startseite &amp; Registrierung</a></p>
    </section>`;
}

export function renderSeoGuide(slug) {
  const guide = SEO_GUIDES[slug];
  if (!guide) return '<p>Seite nicht gefunden.</p>';

  const sectionsHtml = guide.sections
    .map((section) => {
      const stepsHtml = section.steps?.length
        ? `<ol class="seo-guide-steps">${section.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`
        : '';
      const paragraphsHtml = (section.paragraphs || [])
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join('');
      return `
        <section class="legal-section seo-guide-section">
          <h2>${escapeHtml(section.heading)}</h2>
          ${paragraphsHtml}
          ${stepsHtml}
        </section>`;
    })
    .join('');

  return `
    <h1>${escapeHtml(guide.title)}</h1>
    <p class="legal-lead">${escapeHtml(guide.lead)}</p>
    ${sectionsHtml}
    ${renderRelatedLinks(guide.related)}
    ${renderGuideCta()}
    <p class="legal-meta">${escapeHtml(LEGAL_CONFIG.productName)} · Ratgeber</p>
  `;
}

export function renderSeoHub() {
  const homeUrl = getAbsoluteUrl('/');
  const groupsHtml = SEO_HUB.groups
    .map(
      (group) => `
      <section class="legal-section seo-hub-group">
        <h2>${escapeHtml(group.title)}</h2>
        <ul class="seo-hub-list">
          ${group.links
            .map(
              (link) => `
            <li class="seo-hub-list__item">
              <a href="${escapeHtml(link.href)}" class="seo-hub-list__link">${escapeHtml(link.label)}</a>
              <p class="seo-hub-list__desc">${escapeHtml(link.desc)}</p>
            </li>`
            )
            .join('')}
        </ul>
      </section>`
    )
    .join('');

  return `
    <h1>${escapeHtml(SEO_HUB.title)}</h1>
    <p class="legal-lead">${escapeHtml(SEO_HUB.lead)}</p>
    ${groupsHtml}
    <section class="legal-section seo-share">
      <h2>Quotavo verlinken</h2>
      <p>Text zum Teilen in Foren, Social Media oder Partner-Seiten:</p>
      <blockquote class="seo-share__quote">
        <p>${escapeHtml(SEO_HUB.shareText)} <a href="/">${escapeHtml(homeUrl)}</a></p>
      </blockquote>
    </section>
    ${renderGuideCta()}
    <p class="legal-meta">${escapeHtml(LEGAL_CONFIG.productName)} · Ressourcen</p>
  `;
}

export function getGuideHowToSteps(slug) {
  const guide = SEO_GUIDES[slug];
  if (!guide) return [];
  const steps = [];
  for (const section of guide.sections) {
    if (section.steps) steps.push(...section.steps);
  }
  return steps;
}
