import { getDefaultEinheit, getPostenPreis, normalizePostenArt } from './data.js';
import { findKatalogPosten, getKatalogPosten } from './katalogPosten.js';
import {
  formatEuro,
  formatMenge,
  formatPreisInputDisplay,
  parseMengeInput,
  parsePreisInput,
  berechneSummenAusPosten,
} from './pdf.js';

export const ENTWURF_ID = '__entwurf__';

export function createEmptyEntwurf() {
  return { bezeichnung: '', preis: '', einheit: 'Std.', art: 'lohn' };
}

export function createFreiId() {
  return `frei_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createEditorState() {
  return {
    auswahl: new Map(),
    freiePosten: new Map(),
    entwurf: createEmptyEntwurf(),
    einheitPrefs: new Map(),
    artPrefs: new Map(),
    suche: '',
  };
}

export function resolvePostenDetails(postenAuswahl) {
  return postenAuswahl
    .map((item) => {
      const { id, menge, einheit, bezeichnung, beschreibung, preis, art } = item;
      const katalog = findKatalogPosten(id);
      if (katalog) {
        const ein = einheit || getDefaultEinheit(katalog);
        return {
          ...katalog,
          menge,
          einheit: ein,
          art: normalizePostenArt(art ?? katalog.art),
          preis: getPostenPreis(katalog, ein),
        };
      }
      if (bezeichnung || String(id).startsWith('frei_')) {
        return {
          id,
          bezeichnung: bezeichnung || 'Posten',
          beschreibung: beschreibung || '',
          menge,
          einheit: einheit || 'Std.',
          art: normalizePostenArt(art),
          preis: Number(preis) || 0,
        };
      }
      return null;
    })
    .filter(Boolean);
}

export function createPostenEditor(editorState, els) {
  function getPostenEinheit(id) {
    const raw = editorState.auswahl.get(id);
    if (raw && typeof raw === 'object') return raw.einheit;
    if (editorState.einheitPrefs.has(id)) return editorState.einheitPrefs.get(id);
    const posten = findKatalogPosten(id);
    return getDefaultEinheit(posten);
  }

  function getPostenArt(id) {
    const raw = editorState.auswahl.get(id);
    if (raw && typeof raw === 'object' && raw.art) return normalizePostenArt(raw.art);
    if (editorState.artPrefs.has(id)) return editorState.artPrefs.get(id);
    const posten = findKatalogPosten(id);
    return normalizePostenArt(posten?.art);
  }

  function normalizeAuswahl(id) {
    const raw = editorState.auswahl.get(id);
    const posten = findKatalogPosten(id);
    if (raw && typeof raw === 'object') {
      return {
        menge: Number(raw.menge) || 1,
        einheit: raw.einheit || editorState.einheitPrefs.get(id) || getDefaultEinheit(posten),
        art: normalizePostenArt(raw.art ?? editorState.artPrefs.get(id) ?? posten?.art),
      };
    }
    return {
      menge: Number(raw) || 1,
      einheit: editorState.einheitPrefs.get(id) || getDefaultEinheit(posten),
      art: normalizePostenArt(editorState.artPrefs.get(id) ?? posten?.art),
    };
  }

  function getGefiltertePosten() {
    const q = editorState.suche.trim().toLowerCase();
    if (!q) return [];
    return getKatalogPosten().filter(
      (p) =>
        !editorState.auswahl.has(p.id) &&
        (p.bezeichnung.toLowerCase().includes(q) ||
          p.beschreibung.toLowerCase().includes(q))
    );
  }

  function getAusgewaehltePosten() {
    const katalog = getKatalogPosten().filter((p) => editorState.auswahl.has(p.id)).map((p) => {
      const sel = normalizeAuswahl(p.id);
      const einheit = sel.einheit;
      return {
        ...p,
        menge: sel.menge,
        einheit,
        art: sel.art,
        preis: getPostenPreis(p, einheit),
      };
    });

    const frei = Array.from(editorState.freiePosten.entries()).map(([id, data]) => ({
      id,
      bezeichnung: data.bezeichnung,
      beschreibung: data.beschreibung,
      menge: data.menge,
      einheit: data.einheit,
      art: normalizePostenArt(data.art),
      preis: data.preis,
      custom: true,
    }));

    return [...katalog, ...frei];
  }

  function clearPostenState() {
    editorState.auswahl.clear();
    editorState.freiePosten.clear();
    editorState.entwurf = createEmptyEntwurf();
    editorState.einheitPrefs.clear();
    editorState.artPrefs.clear();
    editorState.suche = '';
    if (els.suche) els.suche.value = '';
  }

  function loadPostenFromDocument(posten) {
    editorState.auswahl.clear();
    editorState.freiePosten.clear();
    editorState.entwurf = createEmptyEntwurf();
    editorState.einheitPrefs.clear();
    editorState.artPrefs.clear();

    posten.forEach((item) => {
      const { id, menge, einheit, bezeichnung, beschreibung, preis, art } = item;
      const katalogPosten = findKatalogPosten(id);
      if (katalogPosten) {
        const ein = einheit || getDefaultEinheit(katalogPosten);
        const itemArt = normalizePostenArt(art ?? katalogPosten.art);
        editorState.einheitPrefs.set(id, ein);
        editorState.artPrefs.set(id, itemArt);
        editorState.auswahl.set(id, { menge, einheit: ein, art: itemArt });
        return;
      }

      const freiId = id || createFreiId();
      editorState.freiePosten.set(freiId, {
        bezeichnung: bezeichnung || '',
        beschreibung: beschreibung || '',
        preis: Number(preis) || 0,
        menge,
        einheit: einheit || 'Std.',
        art: normalizePostenArt(art),
      });
    });
  }

  function renderPostenInfo(modus, { id, bezeichnung }) {
    if (modus === 'katalog') {
      return `
      <div class="posten-info">
        <h3>${bezeichnung}</h3>
      </div>
    `;
    }

    const bezeichnungAction = modus === 'entwurf' ? 'entwurf-bezeichnung' : 'frei-bezeichnung';

    return `
    <div class="posten-info posten-info--editierbar">
      <input
        type="text"
        class="posten-info-input posten-info-input--title"
        value="${bezeichnung}"
        placeholder="Tätigkeit"
        aria-label="Tätigkeit"
        data-action="${bezeichnungAction}"
        data-id="${id}"
      />
      <span class="posten-info-add-zone" title="Klicken: +1"></span>
    </div>
  `;
  }

  function renderPostenPreisFeld(modus, { id, preis }) {
    if (modus === 'katalog') {
      return `<span class="posten-preis">${formatEuro(preis)}</span>`;
    }

    return `<input
    type="text"
    inputmode="decimal"
    class="posten-preis-input"
    value="${preis === '' || preis === undefined ? '' : typeof preis === 'string' ? preis : formatMenge(preis)}"
    placeholder="0,00"
    aria-label="Einzelpreis"
    data-action="${modus === 'entwurf' ? 'entwurf-preis' : 'frei-preis'}"
    data-id="${id}"
  />`;
  }

  function renderPostenEinheitFeld(modus, { id, sel }) {
    const einheitAction = modus === 'entwurf' ? 'entwurf-einheit' : 'einheit';

    return `<select class="posten-einheit" data-action="${einheitAction}" data-id="${id}">
    <option value="Stk." ${sel.einheit === 'Stk.' ? 'selected' : ''}>Stück</option>
    <option value="Std." ${sel.einheit === 'Std.' ? 'selected' : ''}>Std.</option>
  </select>`;
  }

  function renderPostenArtFeld(modus, { id, sel }) {
    const artAction = modus === 'entwurf' ? 'entwurf-art' : 'art';
    const art = normalizePostenArt(sel.art);

    return `<select class="posten-art" data-action="${artAction}" data-id="${id}" aria-label="Lohn oder Material">
    <option value="lohn" ${art === 'lohn' ? 'selected' : ''}>Lohn</option>
    <option value="material" ${art === 'material' ? 'selected' : ''}>Material</option>
  </select>`;
  }

  function renderPostenZeile(config) {
    const { id, bezeichnung, preis, sel, modus, aktiv = modus === 'frei' } = config;

    const itemClass =
      modus === 'entwurf'
        ? 'posten-item posten-item--entwurf'
        : `posten-item ${aktiv ? 'posten-item--aktiv' : ''}`;

    return `
    <article class="${itemClass}" data-id="${id}" data-modus="${modus}">
      <div class="posten-menge-feld">
        <input
          type="text"
          inputmode="decimal"
          class="posten-menge-input"
          value="${aktiv ? formatMenge(sel.menge) : ''}"
          placeholder="${modus === 'entwurf' ? '1' : '–'}"
          aria-label="Anzahl ${bezeichnung || 'Posten'}"
          data-action="menge"
          data-id="${id}"
        />
      </div>
      ${renderPostenInfo(modus, { id, bezeichnung })}
      <div class="posten-art-feld">
        ${renderPostenArtFeld(modus, { id, sel })}
      </div>
      <div class="posten-preis-feld">
        ${renderPostenPreisFeld(modus, { id, preis })}
      </div>
      <div class="posten-einheit-feld">
        ${renderPostenEinheitFeld(modus, { id, sel })}
      </div>
    </article>
  `;
  }

  function renderPostenLegende() {
    return `
    <div class="posten-legende" aria-hidden="true">
      <span class="posten-legende__label posten-legende__menge">Anzahl</span>
      <span class="posten-legende__label posten-legende__info">Tätigkeit</span>
      <span class="posten-legende__label posten-legende__art">Lohn/Material</span>
      <span class="posten-legende__label posten-legende__preis">Preis in Euro</span>
      <span class="posten-legende__label posten-legende__einheit">Std/Stück</span>
    </div>
  `;
  }

  function renderPostenListe() {
    if (!els.postenListe) return;
    const suchergebnisse = getGefiltertePosten();
    const teile = [renderPostenLegende()];

    teile.push(
      renderPostenZeile({
        id: ENTWURF_ID,
        bezeichnung: editorState.entwurf.bezeichnung,
        preis: editorState.entwurf.preis,
        sel: { menge: 1, einheit: editorState.entwurf.einheit, art: editorState.entwurf.art },
        modus: 'entwurf',
      })
    );

    for (const id of editorState.auswahl.keys()) {
      const posten = findKatalogPosten(id);
      if (!posten) continue;
      const sel = normalizeAuswahl(id);
      teile.push(
        renderPostenZeile({
          id,
          bezeichnung: posten.bezeichnung,
          beschreibung: posten.beschreibung,
          preis: getPostenPreis(posten, sel.einheit),
          sel,
          modus: 'katalog',
          aktiv: true,
        })
      );
    }

    for (const [id, data] of editorState.freiePosten.entries()) {
      teile.push(
        renderPostenZeile({
          id,
          bezeichnung: data.bezeichnung,
          beschreibung: data.beschreibung,
          preis: data.preis,
          sel: { menge: data.menge, einheit: data.einheit, art: data.art },
          modus: 'frei',
        })
      );
    }

    if (editorState.suche.trim()) {
      if (suchergebnisse.length > 0) {
        teile.push('<p class="posten-suche-hinweis">Katalog-Treffer</p>');
        suchergebnisse.forEach((p) => {
          const sel = { menge: 1, einheit: getPostenEinheit(p.id), art: getPostenArt(p.id) };
          teile.push(
            renderPostenZeile({
              id: p.id,
              bezeichnung: p.bezeichnung,
              beschreibung: p.beschreibung,
              preis: getPostenPreis(p, sel.einheit),
              sel,
              modus: 'katalog',
              aktiv: false,
            })
          );
        });
      } else {
        teile.push(
          '<p class="empty posten-suche-leer">Keine Katalog-Posten gefunden. Legen Sie welche unter „Katalog“ an.</p>'
        );
      }
    }

    els.postenListe.innerHTML = teile.join('');
  }

  function syncEntwurfFromItem(item) {
    if (!item) return;
    const bezeichnungEl = item.querySelector('[data-action="entwurf-bezeichnung"]');
    const preisEl = item.querySelector('[data-action="entwurf-preis"]');
    const einheitEl = item.querySelector('[data-action="entwurf-einheit"]');
    if (bezeichnungEl) editorState.entwurf.bezeichnung = bezeichnungEl.value;
    if (preisEl) editorState.entwurf.preis = preisEl.value;
    if (einheitEl) editorState.entwurf.einheit = einheitEl.value;
    const artEl = item.querySelector('[data-action="entwurf-art"]');
    if (artEl) editorState.entwurf.art = normalizePostenArt(artEl.value);
  }

  function isEntwurfVollstaendig() {
    if (!editorState.entwurf.bezeichnung.trim()) return false;
    if (!String(editorState.entwurf.preis).trim()) return false;
    return !Number.isNaN(parsePreisInput(editorState.entwurf.preis));
  }

  function commitEntwurf(menge) {
    const bezeichnung = editorState.entwurf.bezeichnung.trim();
    if (!bezeichnung) return;

    const parsedPreis = parsePreisInput(editorState.entwurf.preis);
    const preis = Number.isNaN(parsedPreis) ? 0 : Math.max(0, parsedPreis);

    editorState.freiePosten.set(createFreiId(), {
      bezeichnung,
      beschreibung: '',
      preis,
      menge,
      einheit: editorState.entwurf.einheit,
      art: normalizePostenArt(editorState.entwurf.art),
    });
    editorState.entwurf = createEmptyEntwurf();
    render();
  }

  function tryCommitEntwurf(mengeRaw) {
    if (!isEntwurfVollstaendig()) return false;

    let menge = 1;
    const raw = String(mengeRaw ?? '').trim();
    if (raw !== '') {
      const parsed = parseMengeInput(raw);
      if (Number.isNaN(parsed) || parsed <= 0) return false;
      menge = parsed;
    }

    commitEntwurf(menge);
    return true;
  }

  function flushEntwurfIfComplete() {
    const entwurfItem = els.postenListe?.querySelector('.posten-item--entwurf');
    if (!entwurfItem) return false;
    syncEntwurfFromItem(entwurfItem);
    const mengeInput = entwurfItem.querySelector('[data-action="menge"]');
    return tryCommitEntwurf(mengeInput?.value ?? '');
  }

  function updateFreiPosten(id, updates) {
    const data = editorState.freiePosten.get(id);
    if (!data) return;
    editorState.freiePosten.set(id, { ...data, ...updates });
  }

  function removePostenEinmal(id) {
    if (id === ENTWURF_ID) return;

    if (editorState.freiePosten.has(id)) {
      const data = editorState.freiePosten.get(id);
      if (data.menge > 0 && data.menge < 1) {
        editorState.freiePosten.delete(id);
        render();
        return;
      }
      const neueMenge = data.menge - 1;
      if (neueMenge <= 0) editorState.freiePosten.delete(id);
      else updateFreiPosten(id, { menge: neueMenge });
      render();
      return;
    }

    if (!editorState.auswahl.has(id)) return;
    const sel = normalizeAuswahl(id);
    if (sel.menge > 0 && sel.menge < 1) {
      editorState.auswahl.delete(id);
      render();
      return;
    }
    const neueMenge = sel.menge - 1;
    if (neueMenge <= 0) editorState.auswahl.delete(id);
    else editorState.auswahl.set(id, { ...sel, menge: neueMenge });
    render();
  }

  function toggleKatalogPosten(id) {
    if (editorState.auswahl.has(id)) {
      editorState.auswahl.delete(id);
      editorState.einheitPrefs.delete(id);
      editorState.artPrefs.delete(id);
      render();
      return;
    }

    addPostenEinmal(id);
  }

  function addPostenEinmal(id) {
    if (id === ENTWURF_ID) {
      if (!editorState.entwurf.bezeichnung.trim()) return;
      commitEntwurf(1);
      return;
    }

    if (editorState.freiePosten.has(id)) {
      const data = editorState.freiePosten.get(id);
      updateFreiPosten(id, { menge: Math.min(9999, data.menge + 1) });
      render();
      return;
    }

    if (editorState.auswahl.has(id)) {
      const sel = normalizeAuswahl(id);
      editorState.auswahl.set(id, {
        ...sel,
        menge: Math.min(9999, sel.menge + 1),
      });
    } else {
      const posten = findKatalogPosten(id);
      const einheit = getDefaultEinheit(posten);
      const art = normalizePostenArt(posten?.art);
      editorState.einheitPrefs.set(id, einheit);
      editorState.artPrefs.set(id, art);
      editorState.auswahl.set(id, { menge: 1, einheit, art });
    }
    render();
  }

  function setMenge(id, menge) {
    const raw = String(menge).trim();

    if (id === ENTWURF_ID) {
      if (raw === '') {
        tryCommitEntwurf('');
        return;
      }
      const parsed = parseMengeInput(menge);
      if (Number.isNaN(parsed) || parsed <= 0) return;
      if (isEntwurfVollstaendig()) commitEntwurf(parsed);
      return;
    }

    if (raw === '') {
      if (editorState.freiePosten.has(id)) editorState.freiePosten.delete(id);
      else editorState.auswahl.delete(id);
      render();
      return;
    }

    const parsed = parseMengeInput(menge);
    if (Number.isNaN(parsed) || parsed <= 0) {
      if (editorState.freiePosten.has(id)) editorState.freiePosten.delete(id);
      else editorState.auswahl.delete(id);
      render();
      return;
    }

    const wert = Math.min(9999, parsed);

    if (editorState.freiePosten.has(id)) {
      updateFreiPosten(id, { menge: wert });
      render();
      return;
    }

    editorState.auswahl.set(id, { ...normalizeAuswahl(id), menge: wert });
    render();
  }

  function setArt(id, art) {
    const normalized = normalizePostenArt(art);

    if (id === ENTWURF_ID) {
      editorState.entwurf.art = normalized;
      return;
    }

    if (editorState.freiePosten.has(id)) {
      updateFreiPosten(id, { art: normalized });
      render();
      return;
    }

    editorState.artPrefs.set(id, normalized);
    if (editorState.auswahl.has(id)) {
      const sel = normalizeAuswahl(id);
      editorState.auswahl.set(id, { ...sel, art: normalized });
    }
    render();
  }

  function setEinheit(id, einheit) {
    if (id === ENTWURF_ID) {
      editorState.entwurf.einheit = einheit;
      return;
    }

    if (editorState.freiePosten.has(id)) {
      updateFreiPosten(id, { einheit });
      render();
      return;
    }

    editorState.einheitPrefs.set(id, einheit);
    if (editorState.auswahl.has(id)) {
      const sel = normalizeAuswahl(id);
      editorState.auswahl.set(id, { ...sel, einheit });
    }
    render();
  }

  function renderZusammenfassung() {
    flushEntwurfIfComplete();
    const posten = getAusgewaehltePosten();
    const { netto, mwst, brutto } = berechneSummenAusPosten(posten);

    if (els.summeNetto) els.summeNetto.textContent = formatEuro(netto);
    if (els.summeMwst) els.summeMwst.textContent = formatEuro(mwst);
    if (els.summeBrutto) els.summeBrutto.textContent = formatEuro(brutto);

    const kannSpeichern = posten.length > 0 && (els.canSave?.() ?? true);
    const actionBtns = [els.pdfBtn, els.saveBtn, els.saveCloseBtn].filter(Boolean);
    actionBtns.forEach((btn) => {
      btn.disabled = !kannSpeichern;
      btn.setAttribute('aria-disabled', String(!kannSpeichern));
      btn.classList.toggle('is-disabled', !kannSpeichern);
    });

  }

  function render() {
    renderPostenListe();
    renderZusammenfassung();
    els.onUpdate?.();
  }

  function applyPreisInputFormat(input) {
    if (!input?.matches('.posten-preis-input')) return;
    const formatted = formatPreisInputDisplay(input.value);
    if (formatted === null) {
      if (String(input.value).trim() === '') input.value = '';
      return;
    }
    input.value = formatted;
    const { action, id } = input.dataset;
    if (action === 'entwurf-preis') {
      editorState.entwurf.preis = formatted;
      return;
    }
    if (action === 'frei-preis' && editorState.freiePosten.has(id)) {
      const parsed = parsePreisInput(formatted);
      updateFreiPosten(id, { preis: Number.isNaN(parsed) ? 0 : Math.max(0, parsed) });
      render();
    }
  }

  function bindEvents() {
    if (!els.postenListe) return;

    els.postenListe.addEventListener('input', (e) => {
      const target = e.target;
      const { action, id } = target.dataset;
      if (!action) return;

      if (action === 'entwurf-bezeichnung') {
        editorState.entwurf.bezeichnung = target.value;
        return;
      }
      if (action === 'entwurf-preis') {
        editorState.entwurf.preis = target.value;
        return;
      }
      if (action === 'frei-bezeichnung' && editorState.freiePosten.has(id)) {
        updateFreiPosten(id, { bezeichnung: target.value });
        renderZusammenfassung();
      }
    });

    els.postenListe.addEventListener('focusout', (e) => {
      if (e.target.matches('.posten-preis-input')) {
        applyPreisInputFormat(e.target);
      }

      const entwurfItem = e.target.closest('.posten-item--entwurf');
      if (!entwurfItem) return;

      setTimeout(() => {
        if (entwurfItem.contains(document.activeElement)) return;
        syncEntwurfFromItem(entwurfItem);
        const mengeInput = entwurfItem.querySelector('[data-action="menge"]');
        tryCommitEntwurf(mengeInput?.value ?? '');
      }, 0);
    });

    els.postenListe.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.matches('.posten-preis-input')) return;
      e.preventDefault();
      applyPreisInputFormat(e.target);
      const entwurfItem = e.target.closest('.posten-item--entwurf');
      if (!entwurfItem) return;
      syncEntwurfFromItem(entwurfItem);
      const mengeInput = entwurfItem.querySelector('[data-action="menge"]');
      tryCommitEntwurf(mengeInput?.value ?? '');
    });

    els.postenListe.addEventListener('change', (e) => {
      const target = e.target;
      const id = target.dataset.id;
      if (!id) return;
      if (target.dataset.action === 'menge') setMenge(id, target.value);
      else if (target.dataset.action === 'einheit' || target.dataset.action === 'entwurf-einheit') {
        setEinheit(id, target.value);
      } else if (target.dataset.action === 'art' || target.dataset.action === 'entwurf-art') {
        setArt(id, target.value);
      }
    });

    els.postenListe.addEventListener('click', (e) => {
      if (e.target.closest('input, select')) return;
      const info = e.target.closest('.posten-info');
      if (!info) return;
      const item = info.closest('.posten-item');
      if (!item) return;
      addPostenEinmal(item.dataset.id);
    });

    els.postenListe.addEventListener('contextmenu', (e) => {
      if (e.target.closest('input, select')) return;
      const info = e.target.closest('.posten-info');
      if (!info) return;
      e.preventDefault();
      const item = info.closest('.posten-item');
      if (!item || item.dataset.id === ENTWURF_ID) return;
      removePostenEinmal(item.dataset.id);
    });

    els.suche?.addEventListener('input', (e) => {
      editorState.suche = e.target.value;
      renderPostenListe();
    });
  }

  return {
    render,
    refreshSummary: renderZusammenfassung,
    flushEntwurfIfComplete,
    addKatalogPosten: toggleKatalogPosten,
    isKatalogPostenSelected: (id) => editorState.auswahl.has(id),
    getAusgewaehltePosten,
    loadPostenFromDocument,
    clearPostenState,
    bindEvents,
    getPostenForSave: () =>
      getAusgewaehltePosten().map((p) => {
        if (p.custom) {
          return {
            id: p.id,
            menge: p.menge,
            einheit: p.einheit,
            art: normalizePostenArt(p.art),
            bezeichnung: p.bezeichnung,
            beschreibung: p.beschreibung,
            preis: p.preis,
          };
        }
        return { id: p.id, menge: p.menge, einheit: p.einheit, art: normalizePostenArt(p.art) };
      }),
  };
}
