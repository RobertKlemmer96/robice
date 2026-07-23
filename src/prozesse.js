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

/** Aktive Status-Filter (Standard: alle an). */
const activeStatusFilters = new Set(ANGEBOT_PROZESS_STATUS_ORDER);

function isStatusFilterActive(status) {
  return activeStatusFilters.has(status);
}

function toggleStatusFilter(status) {
  if (activeStatusFilters.has(status)) {
    activeStatusFilters.delete(status);
  } else {
    activeStatusFilters.add(status);
  }
}

function filterAngeboteByStatus(angebote) {
  if (activeStatusFilters.size === 0) return [];
  return angebote.filter((a) =>
    activeStatusFilters.has(normalizeAngebotProzessStatus(a.prozessStatus))
  );
}

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
    <div class="prozess-legend">
      <p class="prozess-legend__hint">${escapeHtml(t('prozesse.legendHint'))}</p>
      <div class="prozess-legend__items" role="group" aria-label="${escapeHtml(t('prozesse.legendAria'))}">
        ${ANGEBOT_PROZESS_STATUS_ORDER.map((status) => {
          const active = isStatusFilterActive(status);
          const label = t(angebotProzessStatusLabelKey(status));
          return `
          <button
            type="button"
            class="prozess-legend__item ${angebotProzessStatusCssClass(status)}${active ? ' is-filter-on' : ' is-filter-off'}"
            data-prozess-filter="${escapeHtml(status)}"
            aria-pressed="${active ? 'true' : 'false'}"
            aria-label="${escapeHtml(
              t(active ? 'prozesse.filterHide' : 'prozesse.filterShow', { status: label })
            )}"
          >
            ${escapeHtml(label)}
          </button>`;
        }).join('')}
      </div>
    </div>`;
}

function bindProzesseInteractions(root, { sucheInput, onOpenAngebot } = {}) {
  root.querySelectorAll('[data-prozess-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const status = button.dataset.prozessFilter;
      if (!status) return;
      toggleStatusFilter(status);
      void renderProzesseView(root, { sucheInput, onOpenAngebot });
    });
  });

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
        await renderProzesseView(root, { sucheInput, onOpenAngebot });
      } catch (err) {
        alert(err.message || t('prozesse.saveError'));
        void renderProzesseView(root, { sucheInput, onOpenAngebot });
      } finally {
        select.disabled = false;
      }
    });
  });
}

function emptyMessage({ q, hadAngeboteBeforeFilter }) {
  if (q && !hadAngeboteBeforeFilter) return t('prozesse.notFound');
  if (hadAngeboteBeforeFilter || activeStatusFilters.size === 0) {
    return t('prozesse.filteredEmpty');
  }
  return t('prozesse.empty');
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

    const hadAngeboteBeforeFilter = angebote.length > 0;
    angebote = filterAngeboteByStatus(angebote);

    if (angebote.length === 0) {
      root.innerHTML = `
        ${renderStatusLegend()}
        <p class="empty">${escapeHtml(emptyMessage({ q, hadAngeboteBeforeFilter }))}</p>`;
      bindProzesseInteractions(root, { sucheInput, onOpenAngebot });
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

    bindProzesseInteractions(root, { sucheInput, onOpenAngebot });
  } catch (err) {
    root.innerHTML = `<p class="empty">${escapeHtml(t('prozesse.loadError', { message: err.message }))}</p>`;
  }
}
