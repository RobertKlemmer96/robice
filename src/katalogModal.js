import { getKatalogPosten } from './katalogPosten.js';
import { formatEuro } from './pdf.js';

let modalEl = null;
let listeEl = null;
let sucheEl = null;
let activeEditor = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function closeKatalogModal() {
  if (!modalEl) return;
  modalEl.classList.add('hidden');
  modalEl.setAttribute('aria-hidden', 'true');
  activeEditor = null;
}

function renderKatalogListe(query = '') {
  if (!listeEl) return;

  const q = query.trim().toLowerCase();
  const items = getKatalogPosten().filter(
    (p) =>
      !q ||
      p.bezeichnung.toLowerCase().includes(q) ||
      (p.beschreibung || '').toLowerCase().includes(q)
  );

  if (items.length === 0) {
    listeEl.innerHTML = q
      ? '<p class="empty">Keine Katalog-Posten gefunden.</p>'
      : '<p class="empty">Noch keine Katalog-Posten angelegt. Legen Sie welche unter „Katalog“ in der Navigation an.</p>';
    return;
  }

  listeEl.innerHTML = items
    .map((p) => {
      const selected = activeEditor?.isKatalogPostenSelected?.(p.id);
      return `
        <button type="button" class="katalog-modal-item${selected ? ' is-selected' : ''}" data-katalog-id="${p.id}">
          <span class="katalog-modal-item__main">
            <span class="katalog-modal-item__title">${escapeHtml(p.bezeichnung)}</span>
            ${p.beschreibung ? `<span class="katalog-modal-item__desc">${escapeHtml(p.beschreibung)}</span>` : ''}
          </span>
          <span class="katalog-modal-item__meta">
            <span class="katalog-modal-item__preis-row">
              <span class="katalog-modal-item__preis">${formatEuro(p.preisStk ?? 0)}</span>
              <span class="katalog-modal-item__einheit">/ Stk.</span>
            </span>
            <span class="katalog-modal-item__preis-row">
              <span class="katalog-modal-item__preis">${formatEuro(p.preisStd ?? 0)}</span>
              <span class="katalog-modal-item__einheit">/ Std.</span>
            </span>
          </span>
        </button>`;
    })
    .join('');
}

export function openKatalogModal(editor) {
  if (!modalEl || !editor) return;
  activeEditor = editor;
  if (sucheEl) sucheEl.value = '';
  renderKatalogListe();
  modalEl.classList.remove('hidden');
  modalEl.setAttribute('aria-hidden', 'false');
  sucheEl?.focus();
}

export function initKatalogModal({ modal, liste, suche, openButtons = [] }) {
  modalEl = modal;
  listeEl = liste;
  sucheEl = suche;

  openButtons.forEach(({ button, editor }) => {
    button?.addEventListener('click', () => openKatalogModal(editor));
  });

  modal?.querySelectorAll('[data-close-katalog-modal]').forEach((el) => {
    el.addEventListener('click', closeKatalogModal);
  });

  suche?.addEventListener('input', (e) => {
    renderKatalogListe(e.target.value);
  });

  liste?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-katalog-id]');
    if (!btn || !activeEditor) return;
    activeEditor.addKatalogPosten?.(btn.dataset.katalogId);
    renderKatalogListe(sucheEl?.value || '');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalEl && !modalEl.classList.contains('hidden')) {
      closeKatalogModal();
    }
  });
}
