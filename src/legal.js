import { LEGAL_CONFIG, getCompanyLine } from './legalConfig.js';
import { applySeoMeta } from './seo.js';
import { getLocale, t } from './i18n.js';
import { ROADMAP, ROADMAP_STATUS_LABELS } from './roadmapConfig.js';
import { HANDBOOK } from './handbookConfig.js';
import { FAQ } from './faqConfig.js';

const PAGE_TITLES = {
  impressum: 'Impressum',
  datenschutz: 'Datenschutzerklärung',
  agb: 'Allgemeine Geschäftsbedingungen',
  handbook: 'Handbuch',
  faq: 'FAQ',
  roadmap: 'Roadmap',
};

let returnContext = 'login';
let legalScreenEl = null;
let legalContentEl = null;
let legalBackEl = null;
let onCloseCallback = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function optionalBlock(label, value) {
  if (!value?.trim()) return '';
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}

function renderImpressum() {
  const c = LEGAL_CONFIG;
  const company = getCompanyLine();

  return `
    <h1>Impressum</h1>
    <p class="legal-lead">Angaben gemäß § 5 TMG</p>
    <section class="legal-section">
      <p>
        <strong>${escapeHtml(company)}</strong><br />
        ${escapeHtml(c.street)}<br />
        ${escapeHtml(c.zipCity)}<br />
        ${escapeHtml(c.country)}
      </p>
      <p><strong>Kontakt</strong><br />
        ${c.phone ? `Telefon: ${escapeHtml(c.phone)}<br />` : ''}
        E-Mail: <a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>
      </p>
      ${optionalBlock('Umsatzsteuer-ID', c.vatId)}
      ${c.registerCourt && c.registerNumber ? `<p><strong>Registergericht:</strong> ${escapeHtml(c.registerCourt)}<br /><strong>Registernummer:</strong> ${escapeHtml(c.registerNumber)}</p>` : ''}
      <p><strong>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</strong><br />
        ${escapeHtml(c.responsiblePerson)}<br />
        ${escapeHtml(c.street)}<br />
        ${escapeHtml(c.zipCity)}
      </p>
    </section>
    <section class="legal-section">
      <h2>EU-Streitschlichtung</h2>
      <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
        <a href="https://ec.europa.eu/consumers/odr/" rel="noopener noreferrer" target="_blank">https://ec.europa.eu/consumers/odr/</a>.
        Unsere E-Mail-Adresse finden Sie oben im Impressum.
      </p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>${
        c.participatesInDisputeResolution
          ? 'Wir nehmen an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teil.'
          : 'Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.'
      }</p>
    </section>
    <p class="legal-meta">Stand: ${escapeHtml(c.lastUpdated)}</p>
  `;
}

function renderDatenschutz() {
  const c = LEGAL_CONFIG;
  const company = getCompanyLine();

  return `
    <h1>Datenschutzerklärung</h1>
    <p class="legal-lead">Informationen zur Verarbeitung personenbezogener Daten bei der Nutzung von ${escapeHtml(c.productName)}.</p>

    <section class="legal-section">
      <h2>1. Verantwortlicher</h2>
      <p>
        ${escapeHtml(company)}<br />
        ${escapeHtml(c.street)}<br />
        ${escapeHtml(c.zipCity)}<br />
        E-Mail: <a href="mailto:${escapeHtml(c.privacyEmail)}">${escapeHtml(c.privacyEmail)}</a>
      </p>
    </section>

    <section class="legal-section">
      <h2>2. Überblick</h2>
      <p>Wir verarbeiten personenbezogene Daten, wenn Sie ${escapeHtml(c.productName)} nutzen — insbesondere bei Registrierung, Anmeldung und beim Speichern von Kunden-, Angebots- und Rechnungsdaten.</p>
    </section>

    <section class="legal-section">
      <h2>3. Verarbeitete Daten</h2>
      <h3>Kontodaten</h3>
      <ul>
        <li>Firmenname, E-Mail-Adresse, Passwort (nur als Hash), Rolle, Tarif, Erstellungszeitpunkt</li>
      </ul>
      <h3>Geschäftsdaten</h3>
      <ul>
        <li>Kundendaten (Name, Adresse, Telefon, E-Mail, Notizen)</li>
        <li>Objekte / Einsatzorte</li>
        <li>Angebots- und Rechnungsdaten inkl. Positionen und PDF-Vorlagen</li>
        <li>Hochgeladene Bilder für PDF-Vorlagen (Logo, Header)</li>
      </ul>
      <h3>Technische Daten</h3>
      <ul>
        <li>Session-Cookie (<code>angebot.sid</code>) für die Anmeldung</li>
        <li>Theme-Einstellung in <code>localStorage</code> (<code>angebot_theme</code>)</li>
        <li>Server-Logdateien (IP-Adresse, Zeitpunkt, aufgerufene URL — je nach Server-Konfiguration)</li>
      </ul>
      <p>Es werden keine Marketing- oder Tracking-Cookies eingesetzt. Schriftarten werden lokal vom System bzw. ohne externe Anbieter geladen.</p>
    </section>

    <section class="legal-section">
      <h2>4. Zwecke und Rechtsgrundlagen</h2>
      <ul>
        <li>Bereitstellung der App, Login, Speicherung Ihrer Daten — Art. 6 Abs. 1 lit. b DSGVO</li>
        <li>Sicherheit, Fehlerbehebung, Missbrauchsprävention — Art. 6 Abs. 1 lit. f DSGVO</li>
        <li>Gesetzliche Aufbewahrung (z. B. Rechnungen) — Art. 6 Abs. 1 lit. c DSGVO</li>
      </ul>
    </section>

    <section class="legal-section">
      <h2>5. Speicherdauer</h2>
      <ul>
        <li>Kontodaten: solange das Konto besteht</li>
        <li>Geschäftsdaten: bis zur Löschung durch Sie oder Beendigung des Kontos; Rechnungsdaten ggf. länger gemäß steuerrechtlicher Vorgaben</li>
        <li>Server-Logs: in der Regel ${escapeHtml(String(c.logRetentionDays))} Tage</li>
        <li>Session-Cookie: maximal 7 Tage</li>
      </ul>
    </section>

    <section class="legal-section">
      <h2>6. Hosting</h2>
      <p>
        Anbieter: ${escapeHtml(c.hostingProvider)}<br />
        Standort: ${escapeHtml(c.hostingLocation)}<br />
        Datenbank: SQLite-Datei auf dem Server.
      </p>
      <p>Sofern ein externer Hoster eingesetzt wird, erfolgt die Verarbeitung auf Grundlage eines Auftragsverarbeitungsvertrags (Art. 28 DSGVO).</p>
    </section>

    <section class="legal-section">
      <h2>7. Weitergabe</h2>
      <p>Eine Weitergabe personenbezogener Daten erfolgt nur an IT-/Hosting-Dienstleister (Auftragsverarbeitung), bei gesetzlicher Pflicht an Behörden oder mit Ihrer Einwilligung — nicht zum Verkauf Ihrer Daten.</p>
    </section>

    <section class="legal-section">
      <h2>8. Cookies und lokale Speicherung</h2>
      <table class="legal-table">
        <thead><tr><th>Name</th><th>Typ</th><th>Zweck</th><th>Dauer</th></tr></thead>
        <tbody>
          <tr><td><code>angebot.sid</code></td><td>Session-Cookie</td><td>Login / Sitzung</td><td>max. 7 Tage</td></tr>
          <tr><td><code>angebot_theme</code></td><td>localStorage</td><td>Darstellungsmodus</td><td>bis Löschung</td></tr>
        </tbody>
      </table>
    </section>

    <section class="legal-section">
      <h2>9. Ihre Rechte</h2>
      <p>Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch gemäß DSGVO.</p>
      <p>Anfragen an: <a href="mailto:${escapeHtml(c.privacyEmail)}">${escapeHtml(c.privacyEmail)}</a></p>
      <p>Beschwerderecht bei einer Aufsichtsbehörde, z. B. ${escapeHtml(c.privacyAuthority)}.</p>
    </section>

    <section class="legal-section">
      <h2>10. Datensicherheit</h2>
      <p>Passwörter werden gehasht gespeichert. Session-Cookies sind <code>httpOnly</code>. In Produktion ist HTTPS vorgesehen. Zugriff auf Geschäftsdaten nur nach Anmeldung.</p>
    </section>

    <section class="legal-section">
      <h2>11. Konto löschen</h2>
      <p>Kontolöschung auf Anfrage an <a href="mailto:${escapeHtml(c.privacyEmail)}">${escapeHtml(c.privacyEmail)}</a>. Zugehörige Mandantendaten werden gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
    </section>

    <p class="legal-meta">Stand: ${escapeHtml(c.lastUpdated)}</p>
  `;
}

function renderAgb() {
  const c = LEGAL_CONFIG;
  const company = getCompanyLine();

  return `
    <h1>Allgemeine Geschäftsbedingungen</h1>
    <p class="legal-lead">für die Nutzung der Web-App „${escapeHtml(c.productName)}“</p>

    <section class="legal-section">
      <h2>§ 1 Geltungsbereich</h2>
      <p>Diese AGB gelten für die Nutzung der webbasierten Software zur Erstellung und Verwaltung von Angeboten und Rechnungen durch alle registrierten Nutzer.</p>
      <p>Anbieter: ${escapeHtml(company)}, ${escapeHtml(c.street)}, ${escapeHtml(c.zipCity)} („Anbieter“).</p>
    </section>

    <section class="legal-section">
      <h2>§ 2 Vertragsgegenstand</h2>
      <p>Der Anbieter stellt eine Software-as-a-Service-Lösung (SaaS) über das Internet bereit. Umfang und Funktionen ergeben sich aus dem jeweiligen Tarif.</p>
    </section>

    <section class="legal-section">
      <h2>§ 3 Registrierung</h2>
      <p>Die Registrierung erfolgt mit wahrheitsgemäßen Angaben. Zugangsdaten sind geheim zu halten. Der Kunde haftet für missbräuchliche Nutzung bis zur Mitteilung an den Anbieter.</p>
    </section>

    <section class="legal-section">
      <h2>§ 4 Nutzungsrechte</h2>
      <p>Der Kunde erhält ein einfaches, nicht übertragbares Nutzungsrecht für die Vertragslaufzeit. Weitergabe, Reverse Engineering oder automatisiertes Auslesen sind untersagt, soweit nicht ausdrücklich erlaubt.</p>
    </section>

    <section class="legal-section">
      <h2>§ 5 Pflichten des Kunden</h2>
      <p>Der Kunde nutzt die Software rechtmäßig und ist für die Richtigkeit seiner Kunden-, Angebots- und Rechnungsdaten verantwortlich. Er stellt sicher, dass er zur Verarbeitung eingegebener personenbezogener Daten berechtigt ist.</p>
    </section>

    <section class="legal-section">
      <h2>§ 6 Verfügbarkeit</h2>
      <p>Der Anbieter bemüht sich um hohe Verfügbarkeit, garantiert diese aber nicht ununterbrochen (Wartung, Updates, höhere Gewalt).</p>
    </section>

    <section class="legal-section">
      <h2>§ 7 Preise</h2>
      <p>Der aktuelle Tarif ist kostenlos, sofern nicht anders ausgewiesen. Preisänderungen werden ${escapeHtml(String(c.agbNoticeDays))} Tage vorher mitgeteilt.</p>
    </section>

    <section class="legal-section">
      <h2>§ 8 Laufzeit und Kündigung</h2>
      <p>Der Vertrag läuft auf unbestimmte Zeit und kann von beiden Seiten mit ${escapeHtml(String(c.cancellationNoticeDays))} Tagen Frist zum Monatsende gekündigt werden. Kündigung per E-Mail an <a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>.</p>
    </section>

    <section class="legal-section">
      <h2>§ 9 Datenschutz</h2>
      <p>Es gilt die Datenschutzerklärung. Diese ist in der App unter „Datenschutz“ abrufbar.</p>
    </section>

    <section class="legal-section">
      <h2>§ 10 Haftung</h2>
      <p>Der Anbieter haftet unbeschränkt bei Vorsatz, grober Fahrlässigkeit, Verletzung von Leben, Körper oder Gesundheit sowie nach zwingenden gesetzlichen Vorschriften. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vorhersehbaren, typischen Schaden begrenzt. Keine Haftung für steuerliche Korrektheit erstellter Rechnungen oder Datenverlust durch fehlende eigene Backups.</p>
    </section>

    <section class="legal-section">
      <h2>§ 11 Schlussbestimmungen</h2>
      <p>Es gilt deutsches Recht. Gerichtsstand ist — soweit gesetzlich zulässig — ${escapeHtml(c.jurisdictionCity)}. Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im Übrigen wirksam.</p>
    </section>

    <p class="legal-meta">Stand: ${escapeHtml(c.lastUpdated)}</p>
  `;
}

function renderRoadmapPhase(phase) {
  const statusLabel = ROADMAP_STATUS_LABELS[phase.status] || phase.status;
  const periodLabel = phase.period
    ? phase.quarter
      ? `${phase.period} · ${phase.quarter}`
      : phase.period
    : '';

  return `
    <li class="roadmap-timeline__item roadmap-timeline__item--${escapeHtml(phase.status)}">
      <div class="roadmap-timeline__marker" aria-hidden="true"></div>
      <div class="roadmap-timeline__stripe">
        ${periodLabel ? `<span class="roadmap-timeline__period">${escapeHtml(periodLabel)}</span>` : ''}
        <span class="roadmap-timeline__status">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="roadmap-timeline__body">
        <h2>${escapeHtml(phase.title)}</h2>
        <ul>
          ${phase.points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}
        </ul>
      </div>
    </li>
  `;
}

function renderRoadmap() {
  const c = LEGAL_CONFIG;

  return `
    <h1>Roadmap</h1>
    <p class="legal-lead">Geplante Entwicklung von ${escapeHtml(c.productName)} — fokussiert auf Dienstleistung, ohne Voll-CRM.</p>

    <section class="legal-section roadmap-section">
      <ol class="roadmap-timeline" aria-label="Produkt-Roadmap">
        ${ROADMAP.phases.map(renderRoadmapPhase).join('')}
      </ol>
    </section>

    <section class="legal-section">
      <h2>Bewusst nicht im Scope</h2>
      <ul>
        <li>Volle Disposition oder Kalender</li>
        <li>Zeiterfassung und Lagerhaltung</li>
        <li>E-Mail-Marketing oder Newsletter</li>
      </ul>
    </section>

    <p class="legal-meta">Stand: ${escapeHtml(ROADMAP.lastUpdated)} · Angaben ohne Gewähr, Prioritäten können sich ändern.</p>
  `;
}

function renderHandbookSection(section, index) {
  return `
    <section class="legal-section handbook-section">
      <h2>${index + 1}. ${escapeHtml(section.title)}</h2>
      <ol class="handbook-steps">
        ${section.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
      </ol>
    </section>
  `;
}

function renderHandbook() {
  const c = LEGAL_CONFIG;

  return `
    <h1>Handbuch</h1>
    <p class="legal-lead">${escapeHtml(HANDBOOK.intro)}</p>
    ${HANDBOOK.sections.map(renderHandbookSection).join('')}
    <p class="legal-meta">Stand: ${escapeHtml(HANDBOOK.lastUpdated)} · ${escapeHtml(c.productName)}</p>
  `;
}

function renderFaqItem(item) {
  return `
    <article class="faq-item">
      <h2 class="faq-item__question">${escapeHtml(item.q)}</h2>
      <p class="faq-item__answer">${escapeHtml(item.a)}</p>
    </article>
  `;
}

function renderFaq() {
  const c = LEGAL_CONFIG;

  return `
    <h1>FAQ</h1>
    <p class="legal-lead">${escapeHtml(FAQ.intro)}</p>
    <div class="faq-list">
      ${FAQ.items.map(renderFaqItem).join('')}
    </div>
    <p class="legal-meta">Stand: ${escapeHtml(FAQ.lastUpdated)} · ${escapeHtml(c.productName)}</p>
  `;
}

const RENDERERS = {
  impressum: renderImpressum,
  datenschutz: renderDatenschutz,
  agb: renderAgb,
  handbook: renderHandbook,
  faq: renderFaq,
  roadmap: renderRoadmap,
};

export function renderLegalPage(pageId) {
  const render = RENDERERS[pageId];
  if (!render) return '<p>Seite nicht gefunden.</p>';
  return render();
}

export function initLegal({ onClose } = {}) {
  legalScreenEl = document.getElementById('legal-screen');
  legalContentEl = document.getElementById('legal-content');
  legalBackEl = document.getElementById('legal-back');
  onCloseCallback = onClose;

  legalBackEl?.addEventListener('click', closeLegalPage);

  document.querySelectorAll('[data-legal-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const appVisible = !document.getElementById('app')?.classList.contains('hidden');
      const loginVisible = !document.getElementById('login-screen')?.classList.contains('hidden');
      const returnTo = appVisible ? 'app' : loginVisible ? 'login' : 'landing';
      openLegalPage(btn.dataset.legalPage, returnTo);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && legalScreenEl && !legalScreenEl.classList.contains('hidden')) {
      closeLegalPage();
    }
  });
}

function restoreSeoMeta() {
  applySeoMeta({
    locale: getLocale(),
    title: t('meta.title'),
    description: t('meta.description'),
    ogTitle: t('meta.ogTitle'),
    keywords: t('meta.keywords'),
    author: t('meta.author'),
  });
}

export function openLegalPage(pageId, returnTo = 'login') {
  if (!legalScreenEl || !legalContentEl) return;
  returnContext = returnTo;
  legalContentEl.innerHTML = renderLegalPage(pageId);
  document.title = LEGAL_CONFIG.productName;
  legalScreenEl.classList.remove('hidden');
  legalScreenEl.setAttribute('aria-hidden', 'false');
  legalScreenEl.scrollTop = 0;
  legalBackEl?.focus();
}

export function closeLegalPage() {
  if (!legalScreenEl) return;
  legalScreenEl.classList.add('hidden');
  legalScreenEl.setAttribute('aria-hidden', 'true');
  restoreSeoMeta();
  onCloseCallback?.(returnContext);
}

export function isLegalOpen() {
  return legalScreenEl && !legalScreenEl.classList.contains('hidden');
}
