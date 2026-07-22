import { apiFetch } from './apiClient.js';
import { getAllAngebote } from './angebote.js';
import {
  ANGEBOT_PROZESS_STATUS_ORDER,
  angebotProzessStatusCssClass,
  angebotProzessStatusLabelKey,
  normalizeAngebotProzessStatus,
} from './angebotProzessStatus.js';
import { t } from './i18n.js';
import { formatEuro, formatDatum, berechneSummenAusPosten } from './pdf.js';
import { resolvePostenDetails } from './postenEditor.js';

export async function updateAngebotProzessStatus(id, prozessStatus) {
  return apiFetch(`/api/angebote/${encodeURIComponent(id)}/prozess-status`, {
    method: 'PATCH',
    body: JSON.stringify({ prozessStatus }),
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderStatusLegend() {
  return `
    <div class="prozess-legend" aria-label="${escapeHtml(t('prozesse.legendAria'))}">
      ${ANGEBOT_PROZESS_STATUS_ORDER.map(
        (status) => `
        <span class="prozess-legend__item ${angebotProzessStatusCssClass(status)}">
          ${escapeHtml(t(angebotProzessStatusLabelKey(status)))}
        </span>`
      ).join('')}
    </div>`;
}

function renderStatusSelect(angebotId, status) {
  const normalized = normalizeAngebotProzessStatus(status);
  return `
    <select
      class="prozess-status-select ${angebotProzessStatusCssClass(normalized)}"
      data-prozess-status-id="${escapeHtml(angebotId)}"
      aria-label="${escapeHtml(t('prozesse.statusChange'))}"
    >
      ${ANGEBOT_PROZESS_STATUS_ORDER.map(
        (value) => `
        <option value="${escapeHtml(value)}"${value === normalized ? ' selected' : ''}>
          ${escapeHtml(t(angebotProzessStatusLabelKey(value)))}
        </option>`
      ).join('')}
    </select>`;
}

export async function renderProzesseView(root, { sucheInput, onOpenAngebot } = {}) {
  if (!root) return;

  const q = (sucheInput?.value || '').trim().toLowerCase();
  root.innerHTML = `<p class="empty">${escapeHtml(t('common.loading'))}</p>`;

  try {
    let angebote = await getAllAngebote();

    if (q) {
      angebote = angebote.filter(
        (a) =>
          a.angebotNr.toLowerCase().includes(q) ||
          (a.kunde?.name || '').toLowerCase().includes(q)
      );
    }

    if (angebote.length === 0) {
      root.innerHTML = `
        ${renderStatusLegend()}
        <p class="empty">${escapeHtml(q ? t('prozesse.notFound') : t('prozesse.empty'))}</p>`;
      return;
    }

    root.innerHTML = `
      ${renderStatusLegend()}
      <ul class="prozess-liste">
        ${angebote
          .map((a) => {
            const posten = resolvePostenDetails(a.posten);
            const { brutto } = berechneSummenAusPosten(posten);
            const kunde = a.kunde?.name || t('dashboard.noCustomer');
            const datum = formatDatum(new Date(a.angebotsdatum || a.aktualisiertAm || a.erstelltAm));

            return `
            <li class="prozess-item" data-id="${escapeHtml(a.id)}">
              <button type="button" class="prozess-item__info" data-prozess-open="${escapeHtml(a.id)}">
                <div class="prozess-item__top">
                  <strong class="prozess-item__nr">${escapeHtml(a.angebotNr)}</strong>
                  <span class="prozess-item__betrag">${escapeHtml(formatEuro(brutto))}</span>
                </div>
                <p class="prozess-item__kunde">${escapeHtml(kunde)}</p>
                <p class="prozess-item__meta">${escapeHtml(datum)} · ${escapeHtml(t('posten.many', { count: posten.length }))}</p>
              </button>
              <div class="prozess-item__status">
                ${renderStatusSelect(a.id, a.prozessStatus)}
              </div>
            </li>`;
          })
          .join('')}
      </ul>`;

    root.querySelectorAll('[data-prozess-open]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.prozessOpen;
        if (id && onOpenAngebot) onOpenAngebot(id);
      });
    });

    root.querySelectorAll('[data-prozess-status-id]').forEach((select) => {
      select.addEventListener('change', async () => {
        const id = select.dataset.prozessStatusId;
        const nextStatus = select.value;
        select.disabled = true;
        try {
          await updateAngebotProzessStatus(id, nextStatus);
          select.className = `prozess-status-select ${angebotProzessStatusCssClass(nextStatus)}`;
        } catch (err) {
          alert(err.message || t('prozesse.saveError'));
          void renderProzesseView(root, { sucheInput, onOpenAngebot });
        } finally {
          select.disabled = false;
        }
      });
    });
  } catch (err) {
    root.innerHTML = `<p class="empty">${escapeHtml(t('prozesse.loadError', { message: err.message }))}</p>`;
  }
}
