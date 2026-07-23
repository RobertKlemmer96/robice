import { apiFetch } from './apiClient.js';
import { getSession } from './auth.js';
import { t } from './i18n.js';
import { formatPlanLabel, isFreePlan, FREE_DOCUMENT_LIMIT } from './plans.js';
import { formatDatum } from './pdf.js';

export async function loadDashboardData() {
  return apiFetch('/api/auth/dashboard');
}

export async function loadNotificationSummary() {
  return apiFetch('/api/auth/notifications/summary');
}

export async function markNotificationsSeen() {
  return apiFetch('/api/auth/notifications/seen', { method: 'POST' });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatActivityDate(value) {
  if (!value) return '—';
  return formatDatum(value);
}

function greetingKey() {
  const hour = new Date().getHours();
  if (hour < 11) return 'dashboard.greetingMorning';
  if (hour < 18) return 'dashboard.greetingDay';
  return 'dashboard.greetingEvening';
}

const STAT_ICONS = {
  angebote: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`,
  rechnungen: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 2h9l3 3v17a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/><path d="M15 2v4h4M8 13h8M8 17h5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`,
  kunden: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M5 20c0-3.3 3.1-5 7-5s7 1.7 7 5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`,
  katalog: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.75"/></svg>`,
};

const ACTION_ICONS = {
  neu: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`,
  'rechnung-neu': `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`,
  archiv: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1-3h10l1 3" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  kunden: STAT_ICONS.kunden,
  'pdf-vorlage': `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M14 3v5h5M9 13h6M9 17h4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`,
};

const SETUP_FIELD_KEYS = {
  companyName: 'pdfTpl.companyName',
  street: 'pdfTpl.street',
  zipCity: 'pdfTpl.zipCity',
  phone: 'pdfTpl.phone',
  email: 'pdfTpl.email',
  vatId: 'pdfTpl.vatId',
  iban: 'pdfTpl.iban',
};

function notificationStatusLabel(status) {
  if (status === 'bestaetigt') return t('dashboard.notificationConfirmed');
  if (status === 'abgelehnt') return t('dashboard.notificationRejected');
  return status || '—';
}

export function renderDashboard(root, data, { onNavigate, onNotificationsSeen } = {}) {
  if (!root) return;

  const session = getSession();
  const tenant = session?.tenant;
  const companyName = tenant?.name?.trim() || t('dashboard.noCompanyName');
  const stats = data?.stats ?? {
    kunden: 0,
    angebote: 0,
    rechnungen: 0,
    katalog: 0,
    angeboteMonat: 0,
    rechnungenMonat: 0,
    faelligBald: 0,
  };
  const recentDocuments = data?.recentDocuments ?? [];
  const setupMissing = data?.setupMissing ?? [];
  const planLimits = data?.planLimits ?? null;
  const notifications = data?.notifications ?? { unreadCount: 0, items: [] };
  const unreadCount = notifications.unreadCount ?? 0;
  const notificationItems = notifications.items ?? [];
  const showPlanLimits = isFreePlan(tenant?.plan) && planLimits?.angebote?.max != null;

  const quotaHint = (key) => {
    if (!showPlanLimits) return null;
    const bucket = planLimits[key];
    if (!bucket?.max) return null;
    return t('planLimits.statQuota', { used: bucket.used, max: bucket.max });
  };

  const statCards = [
    {
      key: 'angebote',
      tone: 'angebote',
      label: t('dashboard.statsOffers'),
      value: stats.angebote,
      hint:
        quotaHint('angebote') ||
        (stats.angeboteMonat > 0
          ? t('dashboard.monthCount', { count: stats.angeboteMonat, type: t('dashboard.statsOffers') })
          : t('dashboard.noActivityMonth')),
      view: 'archiv',
    },
    {
      key: 'rechnungen',
      tone: 'rechnungen',
      label: t('dashboard.statsInvoices'),
      value: stats.rechnungen,
      hint:
        quotaHint('rechnungen') ||
        (stats.rechnungenMonat > 0
          ? t('dashboard.monthCount', { count: stats.rechnungenMonat, type: t('dashboard.statsInvoices') })
          : t('dashboard.noActivityMonth')),
      view: 'rechnung-archiv',
    },
    {
      key: 'kunden',
      tone: 'kunden',
      label: t('dashboard.statsCustomers'),
      value: stats.kunden,
      hint: t('dashboard.statsCustomersHint'),
      view: 'kunden',
    },
    {
      key: 'katalog',
      tone: 'katalog',
      label: t('dashboard.statsCatalog'),
      value: stats.katalog,
      hint: t('dashboard.statsCatalogHint'),
      view: 'katalog',
    },
  ];

  const quickActions = [
    {
      label: t('nav.offersNew'),
      desc: t('dashboard.actionOfferDesc'),
      view: 'neu',
      tone: 'primary',
    },
    {
      label: t('nav.invoicesNew'),
      desc: t('dashboard.actionInvoiceDesc'),
      view: 'rechnung-neu',
      tone: 'invoice',
    },
    {
      label: t('nav.customers'),
      desc: t('dashboard.actionCustomersDesc'),
      view: 'kunden',
      tone: 'default',
    },
    {
      label: t('nav.template'),
      desc: t('dashboard.actionTemplateDesc'),
      view: 'pdf-vorlage',
      tone: 'default',
    },
  ];

  const setupBlock =
    setupMissing.length > 0
      ? `
      <section class="dashboard-panel dashboard-panel--setup">
        <h3 class="dashboard-panel__title">${escapeHtml(t('dashboard.setupTitle'))}</h3>
        <p class="dashboard-panel__lead">${escapeHtml(t('dashboard.setupLead'))}</p>
        <ul class="dashboard-setup__list">
          ${setupMissing
            .slice(0, 5)
            .map(
              (field) => `
            <li class="dashboard-setup__item">
              <span class="dashboard-setup__dot" aria-hidden="true"></span>
              <span>${escapeHtml(t(SETUP_FIELD_KEYS[field] || field))}</span>
            </li>`
            )
            .join('')}
        </ul>
        <button type="button" class="btn btn-ghost btn-sm dashboard-panel__cta" data-dashboard-nav="profil">
          ${escapeHtml(t('dashboard.setupCta'))}
        </button>
      </section>`
      : `
      <section class="dashboard-panel dashboard-panel--ready">
        <h3 class="dashboard-panel__title">${escapeHtml(t('dashboard.setupDoneTitle'))}</h3>
        <p class="dashboard-panel__lead">${escapeHtml(t('dashboard.setupDoneLead'))}</p>
      </section>`;

  const planLimitsBlock = showPlanLimits
    ? (() => {
        const angeboteRemaining = planLimits.angebote.remaining ?? 0;
        const rechnungenRemaining = planLimits.rechnungen.remaining ?? 0;
        const atLimit = angeboteRemaining <= 0 && rechnungenRemaining <= 0;
        const lead = atLimit
          ? t('planLimits.dashboardFull')
          : t('planLimits.dashboardLead', {
              angeboteRemaining,
              rechnungenRemaining,
              max: planLimits.angebote.max ?? FREE_DOCUMENT_LIMIT,
            });
        return `
      <section class="dashboard-panel dashboard-panel--limits">
        <h3 class="dashboard-panel__title">${escapeHtml(t('planLimits.dashboardTitle'))}</h3>
        <p class="dashboard-panel__lead">${escapeHtml(lead)}</p>
        <div class="dashboard-limits__rows">
          <div class="dashboard-limits__row">
            <span>${escapeHtml(t('dashboard.statsOffers'))}</span>
            <strong>${escapeHtml(t('planLimits.statQuota', { used: planLimits.angebote.used, max: planLimits.angebote.max }))}</strong>
          </div>
          <div class="dashboard-limits__row">
            <span>${escapeHtml(t('dashboard.statsInvoices'))}</span>
            <strong>${escapeHtml(t('planLimits.statQuota', { used: planLimits.rechnungen.used, max: planLimits.rechnungen.max }))}</strong>
          </div>
        </div>
        <button type="button" class="btn btn-ghost btn-sm dashboard-panel__cta" data-dashboard-nav="profil">
          ${escapeHtml(t('planLimits.dashboardUpgrade'))}
        </button>
      </section>`;
      })()
    : '';

  const dueBlock =
    stats.faelligBald > 0
      ? `
      <section class="dashboard-panel dashboard-panel--due">
        <p class="dashboard-due__value">${escapeHtml(String(stats.faelligBald))}</p>
        <h3 class="dashboard-panel__title">${escapeHtml(t('dashboard.dueTitle'))}</h3>
        <p class="dashboard-panel__lead">${escapeHtml(t('dashboard.dueLead'))}</p>
        <button type="button" class="btn btn-ghost btn-sm dashboard-panel__cta" data-dashboard-nav="rechnung-archiv">
          ${escapeHtml(t('dashboard.dueCta'))}
        </button>
      </section>`
      : '';

  const notificationsBadge =
    unreadCount > 0
      ? `<span class="dashboard-panel__badge" aria-label="${escapeHtml(t('dashboard.notificationsUnread', { count: unreadCount }))}">${escapeHtml(String(unreadCount))}</span>`
      : '';

  const notificationsBlock = `
      <section class="card dashboard-panel dashboard-panel--notifications" aria-labelledby="dashboard-notifications-title">
        <div class="dashboard-panel__head">
          <h3 id="dashboard-notifications-title" class="dashboard-panel__title dashboard-panel__title--with-badge">
            ${escapeHtml(t('dashboard.notificationsTitle'))}
            ${notificationsBadge}
          </h3>
          ${
            unreadCount > 0
              ? `<button type="button" class="btn btn-ghost btn-sm" data-dashboard-mark-notifications-read>${escapeHtml(t('dashboard.notificationsMarkRead'))}</button>`
              : ''
          }
        </div>
        ${
          notificationItems.length
            ? `<ul class="dashboard-notifications__list">
                ${notificationItems
                  .map(
                    (item) => `
                  <li class="dashboard-notifications__item${item.unread ? ' dashboard-notifications__item--unread' : ''}">
                    <button type="button" class="dashboard-notifications__link" data-dashboard-nav="prozesse">
                      <span class="dashboard-notifications__status dashboard-notifications__status--${escapeHtml(item.status)}">${escapeHtml(notificationStatusLabel(item.status))}</span>
                      <span class="dashboard-notifications__main">
                        <strong>${escapeHtml(item.angebotNr || '—')}</strong>
                        <span>${escapeHtml(item.customer || t('dashboard.noCustomer'))}</span>
                      </span>
                      <span class="dashboard-notifications__date">${escapeHtml(formatActivityDate(item.respondedAt))}</span>
                    </button>
                  </li>`
                  )
                  .join('')}
              </ul>`
            : `<p class="dashboard-panel__lead dashboard-notifications__empty">${escapeHtml(t('dashboard.notificationsEmpty'))}</p>`
        }
      </section>`;

  root.innerHTML = `
    <div class="dashboard-layout">
      <section class="dashboard-hero card">
        <span class="dashboard-plan dashboard-hero__plan">${escapeHtml(formatPlanLabel(tenant?.plan))}</span>
        <div class="dashboard-hero__content">
          <p class="dashboard-hero__eyebrow">${escapeHtml(t(greetingKey()))}</p>
          <h2 class="dashboard-hero__title">${escapeHtml(companyName)}</h2>
        </div>
      </section>

      <div class="dashboard-stats">
        ${statCards
          .map(
            (card) => `
          <button type="button" class="dashboard-stat dashboard-stat--${card.tone}" data-dashboard-nav="${escapeHtml(card.view)}">
            <span class="dashboard-stat__icon">${STAT_ICONS[card.key] || ''}</span>
            <span class="dashboard-stat__body">
              <span class="dashboard-stat__label">${escapeHtml(card.label)}</span>
              <span class="dashboard-stat__value">${escapeHtml(String(card.value))}</span>
              <span class="dashboard-stat__hint">${escapeHtml(card.hint)}</span>
            </span>
          </button>`
          )
          .join('')}
      </div>

      <div class="dashboard-main">
        <div class="dashboard-main__primary">
          ${notificationsBlock}

          <section class="card dashboard-panel">
            <h3 class="dashboard-panel__title">${escapeHtml(t('dashboard.quickActions'))}</h3>
            <div class="dashboard-actions">
              ${quickActions
                .map(
                  (action) => `
                <button
                  type="button"
                  class="dashboard-action dashboard-action--${action.tone}"
                  data-dashboard-nav="${escapeHtml(action.view)}"
                >
                  <span class="dashboard-action__icon">${ACTION_ICONS[action.view] || ACTION_ICONS.neu}</span>
                  <span class="dashboard-action__text">
                    <strong>${escapeHtml(action.label)}</strong>
                    <span>${escapeHtml(action.desc)}</span>
                  </span>
                </button>`
                )
                .join('')}
            </div>
          </section>

          <section class="card dashboard-panel dashboard-panel--recent" aria-labelledby="dashboard-recent-title">
            <div class="dashboard-panel__head">
              <h3 id="dashboard-recent-title" class="dashboard-panel__title">${escapeHtml(t('dashboard.recentDocuments'))}</h3>
              <div class="dashboard-panel__head-actions">
                <button type="button" class="btn btn-ghost btn-sm" data-dashboard-nav="archiv">${escapeHtml(t('nav.offersArchiveShort'))}</button>
                <button type="button" class="btn btn-ghost btn-sm" data-dashboard-nav="rechnung-archiv">${escapeHtml(t('nav.invoicesArchiveShort'))}</button>
              </div>
            </div>
            ${
              recentDocuments.length
                ? `<ul class="dashboard-recent__list">
                    ${recentDocuments
                      .map((doc) => {
                        const isInvoice = doc.type === 'rechnung';
                        const typeLabel = isInvoice ? t('dashboard.invoice') : t('dashboard.offer');
                        const targetView = isInvoice ? 'rechnung-archiv' : 'archiv';
                        return `
                        <li class="dashboard-recent__item">
                          <button type="button" class="dashboard-recent__link" data-dashboard-nav="${escapeHtml(targetView)}">
                            <span class="dashboard-recent__badge dashboard-recent__badge--${isInvoice ? 'invoice' : 'offer'}">${escapeHtml(typeLabel)}</span>
                            <span class="dashboard-recent__main">
                              <strong class="dashboard-recent__nr">${escapeHtml(doc.number || '—')}</strong>
                              <span class="dashboard-recent__customer">${escapeHtml(doc.customer || t('dashboard.noCustomer'))}</span>
                            </span>
                            <span class="dashboard-recent__date">${escapeHtml(formatActivityDate(doc.date))}</span>
                          </button>
                        </li>`;
                      })
                      .join('')}
                  </ul>`
                : `<div class="dashboard-empty">
                    <p>${escapeHtml(t('dashboard.noDocuments'))}</p>
                    <button type="button" class="btn btn-primary btn-sm" data-dashboard-nav="neu">${escapeHtml(t('nav.offersNew'))}</button>
                  </div>`
            }
          </section>
        </div>

        <aside class="dashboard-main__aside">
          ${planLimitsBlock}
          ${dueBlock}
          ${setupBlock}
        </aside>
      </div>
    </div>
  `;

  root.querySelectorAll('[data-dashboard-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.dashboardNav;
      if (view && onNavigate) onNavigate(view);
    });
  });

  root.querySelector('[data-dashboard-mark-notifications-read]')?.addEventListener('click', () => {
    if (onNotificationsSeen) onNotificationsSeen();
  });
}
