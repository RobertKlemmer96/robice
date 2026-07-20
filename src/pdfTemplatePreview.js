import { previewAngebotsnummer, previewRechnungsnummer } from './dokumentnummer.js';
import { berechneSummenAusPosten, formatEuro } from './pdf.js';
import { getPdfTemplate } from './pdfTemplate.js';
import {
  applyPdfLayoutPreviewVariantStyles,
  createPdfLayoutPreviewMarkup,
  normalizePdfLayoutVariant,
} from './pdfLayoutVariants.js';

export { createPdfLayoutPreviewMarkup, normalizePdfLayoutVariant };

const SAMPLE_KUNDE = {
  name: 'Musterkunde GmbH',
  lines: ['Musterstraße 12', '12345 Musterstadt'],
};

const SAMPLE_POSTEN = [
  { bez: 'Beratung vor Ort', menge: 2, einheit: 'Std.', preis: 95, sum: '190,00 €' },
  { bez: 'Materialpauschale', menge: 1, einheit: 'Stk.', preis: 45, sum: '45,00 €' },
];

function samplePreviewTotals() {
  return berechneSummenAusPosten(SAMPLE_POSTEN);
}

function readFormValue(form, name, fallback = '') {
  const el = form.elements[name];
  if (!el) return fallback;
  if (el.type === 'checkbox') return el.checked;
  return String(el.value ?? fallback).trim();
}

function setText(root, selector, text) {
  root.querySelector(selector)?.replaceChildren(document.createTextNode(text || ' '));
}

function setHtml(root, selector, html) {
  const el = root.querySelector(selector);
  if (el) el.innerHTML = html;
}

function setVisible(root, selector, visible) {
  root.querySelector(selector)?.classList.toggle('hidden', !visible);
}

function setStyle(root, selector, prop, value) {
  const el = root.querySelector(selector);
  if (el) el.style[prop] = value;
}

export function updatePdfTemplatePreview(form, previewRoot, type, variant = 1) {
  if (!form || !previewRoot) return;
  const layoutVariant = normalizePdfLayoutVariant(variant);
  if (
    previewRoot.dataset.previewType !== type ||
    Number(previewRoot.dataset.previewVariant) !== layoutVariant ||
    !previewRoot.querySelector('.pdf-layout-preview__sheet')
  ) {
    previewRoot.innerHTML = createPdfLayoutPreviewMarkup(type, layoutVariant);
    previewRoot.dataset.previewType = type;
    previewRoot.dataset.previewVariant = String(layoutVariant);
    delete previewRoot.dataset.sectionClicksBound;
  }

  const firmaName = readFormValue(form, 'firma-name', 'Ihre Firma');
  const firmaStrasse = readFormValue(form, 'firma-strasse', 'Straße');
  const firmaPlzOrt = readFormValue(form, 'firma-plzOrt', 'PLZ Ort');
  const firmaTelefon = readFormValue(form, 'firma-telefon');
  const firmaEmail = readFormValue(form, 'firma-email');
  const firmaUst = readFormValue(form, 'firma-ustId');
  const primaer = readFormValue(form, 'farbe-primaer', '#1e3a5f');
  const textMuted = readFormValue(form, 'farbe-textMuted', '#505050');
  const fussfarbe = readFormValue(form, 'farbe-fusszeile', '#646464');
  const lineColor = readFormValue(form, 'farbe-trennlinie', '#dcdcdc');
  const headerActive = readFormValue(form, 'layout-headerAktiv', false);
  const logoData = form.dataset.logoData || '';
  const headerData = form.dataset.headerData || '';

  const isAngebot = type === 'angebot';
  const titel = isAngebot
    ? readFormValue(form, 'text-titel', 'ANGEBOT')
    : readFormValue(form, 'rechnung-text-titel', 'RECHNUNG');
  const einleitung = isAngebot
    ? readFormValue(form, 'text-einleitung', 'Gerne unterbreiten wir Ihnen folgendes Angebot:')
    : readFormValue(form, 'rechnung-text-einleitung', 'Wir stellen Ihnen folgende Leistungen in Rechnung:');
  const fuss1 = isAngebot
    ? readFormValue(form, 'text-fuss1', 'Dieses Angebot ist freibleibend.')
    : readFormValue(form, 'rechnung-text-fuss1', 'Bitte überweisen Sie bis zum Fälligkeitsdatum.');
  const fuss2 = isAngebot
    ? readFormValue(form, 'text-fuss2', 'Wir freuen uns auf Ihre Rückmeldung.')
    : readFormValue(form, 'rechnung-text-fuss2', 'Es gelten unsere AGB.');

  setVisible(previewRoot, '[data-preview-part="banner"]', headerActive && !!headerData);
  const bannerImg = previewRoot.querySelector('[data-preview-part="banner"] img');
  if (bannerImg) {
    if (headerActive && headerData) {
      bannerImg.src = headerData;
      bannerImg.classList.remove('hidden');
    } else {
      bannerImg.removeAttribute('src');
      bannerImg.classList.add('hidden');
    }
  }

  const logoWrap = previewRoot.querySelector('[data-preview-part="logo"]');
  const logoImg = previewRoot.querySelector('[data-preview-part="logo"] img');
  const logoFallback = previewRoot.querySelector('[data-preview-part="logo-fallback"]');
  if (logoData) {
    logoWrap?.classList.remove('hidden');
    logoFallback?.classList.add('hidden');
    if (logoImg) logoImg.src = logoData;
  } else {
    logoWrap?.classList.add('hidden');
    logoFallback?.classList.remove('hidden');
    setText(previewRoot, '[data-preview-part="logo-fallback"]', layoutVariant === 3 ? firmaName.toUpperCase() : firmaName);
  }

  setText(previewRoot, '[data-preview-part="firma-strasse"]', firmaStrasse);
  setText(previewRoot, '[data-preview-part="firma-plz"]', firmaPlzOrt);
  setText(
    previewRoot,
    '[data-preview-part="letterhead-address"]',
    [firmaStrasse, firmaPlzOrt].filter(Boolean).join(' · ') || 'Adresse'
  );
  setText(
    previewRoot,
    '[data-preview-part="sender-text"]',
    [firmaName, firmaStrasse, firmaPlzOrt].filter(Boolean).join(' · ') || 'Absender'
  );
  setText(
    previewRoot,
    '[data-preview-part="firma-kontakt"]',
    [firmaTelefon && `Tel: ${firmaTelefon}`, firmaEmail && firmaEmail, firmaUst && `USt-IdNr.: ${firmaUst}`]
      .filter(Boolean)
      .join(' · ') || 'Kontaktdaten'
  );

  setText(previewRoot, '[data-preview-part="doc-titel"]', titel || (isAngebot ? 'ANGEBOT' : 'RECHNUNG'));
  setText(
    previewRoot,
    '[data-preview-part="kunde-label"]',
    isAngebot ? 'Angebot für:' : 'Rechnung an:'
  );
  setText(previewRoot, '[data-preview-part="einleitung"]', einleitung || 'Einleitungstext');
  setText(previewRoot, '[data-preview-part="fuss1"]', fuss1 || 'Fußzeile 1');
  setText(previewRoot, '[data-preview-part="fuss2"]', fuss2 || 'Fußzeile 2');

  for (let index = 1; index <= 3; index += 1) {
    setText(
      previewRoot,
      `[data-preview-part="fuss-col${index}-header"]`,
      readFormValue(form, `fuss-spalte${index}-ueberschrift`, `Spalte ${index}`)
    );
    setText(
      previewRoot,
      `[data-preview-part="fuss-col${index}-text"]`,
      readFormValue(form, `fuss-spalte${index}-text`, 'Text')
    );
  }

  if (isAngebot) {
    const schema = getPdfTemplate().angebot?.nummerSchema;
    const nr = schema
      ? previewAngebotsnummer(schema, new Date(), 1)
      : 'ANG-20260719-001';
    setText(previewRoot, '[data-preview-part="meta-1"]', `Angebotsnr.: ${nr}`);
    setText(previewRoot, '[data-preview-part="meta-2"]', `Angebotsdatum: ${new Date().toLocaleDateString('de-DE')}`);
    setText(previewRoot, '[data-preview-part="meta-3"]', 'Gültig bis: 31.08.2026');
    setVisible(previewRoot, '[data-preview-part="meta-4"]', false);
  } else {
    const schema = getPdfTemplate().rechnung?.nummerSchema;
    const nr = schema
      ? previewRechnungsnummer(schema, new Date(), 1)
      : 'RE-20260719-001';
    setText(previewRoot, '[data-preview-part="meta-1"]', `Rechnungsnr.: ${nr}`);
    setText(previewRoot, '[data-preview-part="meta-2"]', `Rechnungsdatum: ${new Date().toLocaleDateString('de-DE')}`);
    setText(previewRoot, '[data-preview-part="meta-3"]', 'Fällig am: 02.08.2026');
    setVisible(previewRoot, '[data-preview-part="meta-4"]', true);
    setText(previewRoot, '[data-preview-part="meta-4"]', 'Bezug Angebot: ANG-20260719-001');
  }

  setText(previewRoot, '[data-preview-part="kunde-name"]', SAMPLE_KUNDE.name);
  setHtml(
    previewRoot,
    '[data-preview-part="kunde-adresse"]',
    SAMPLE_KUNDE.lines.map((line) => `<span>${line}</span>`).join('')
  );

  const tableHead = previewRoot.querySelector('[data-preview-part="table-head"]');
  if (tableHead) {
    tableHead.style.backgroundColor = '';
    tableHead.style.color = '';
    tableHead.style.borderBottom = '';
    tableHead.querySelectorAll('th').forEach((th) => {
      th.style.borderColor = '';
      th.style.backgroundColor = '';
      th.style.color = '';
    });

    if (layoutVariant === 2) {
      tableHead.style.backgroundColor = 'transparent';
      tableHead.style.color = primaer;
      tableHead.style.borderBottom = `2px solid ${primaer}`;
      tableHead.querySelectorAll('th').forEach((th) => {
        th.style.borderColor = 'transparent';
        th.style.borderBottom = `2px solid ${primaer}`;
        th.style.backgroundColor = 'transparent';
        th.style.color = primaer;
      });
    } else if (layoutVariant === 3) {
      tableHead.style.backgroundColor = 'transparent';
      tableHead.style.color = '#374151';
      tableHead.style.borderBottom = `1px solid ${lineColor}`;
      tableHead.querySelectorAll('th').forEach((th) => {
        th.style.border = 'none';
        th.style.borderBottom = `1px solid ${lineColor}`;
        th.style.fontWeight = '600';
      });
    } else {
      tableHead.style.backgroundColor = primaer;
      tableHead.style.color = '#ffffff';
    }
  }

  applyPdfLayoutPreviewVariantStyles(previewRoot, layoutVariant, {
    primaer,
    lineColor,
  });

  if (layoutVariant === 1) {
    setStyle(previewRoot, '[data-preview-part="trennlinie"]', 'borderColor', lineColor);
  }
  setStyle(previewRoot, '[data-preview-part="fuss-trennlinie"]', 'borderColor', lineColor);
  setStyle(previewRoot, '[data-preview-part="firma-block"]', 'color', textMuted);
  setStyle(previewRoot, '[data-preview-part="fuss-block"]', 'color', fussfarbe);
  setStyle(previewRoot, '[data-preview-part="fuss-closing"]', 'color', fussfarbe);

  const tbody = previewRoot.querySelector('[data-preview-part="table-body"]');
  if (tbody) {
    if (layoutVariant === 3) {
      tbody.innerHTML = SAMPLE_POSTEN.map(
        (row, i) => `
        <tr class="${i % 2 === 1 ? 'is-alt' : ''}">
          <td>${i + 1}.</td>
          <td>${row.bez}</td>
          <td>${row.menge} ${row.einheit}</td>
          <td>${row.sum}</td>
        </tr>`
      ).join('');
    } else if (layoutVariant === 2) {
      tbody.innerHTML = SAMPLE_POSTEN.map(
        (row, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${row.bez}</td>
          <td>${row.menge}</td>
          <td>${formatEuro(row.preis)}</td>
          <td>${row.sum}</td>
        </tr>`
      ).join('');
    } else {
      tbody.innerHTML = SAMPLE_POSTEN.map(
        (row, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${row.bez}</td>
          <td>${row.menge}</td>
          <td>${row.einheit}</td>
          <td>${formatEuro(row.preis)}</td>
          <td>${row.sum}</td>
        </tr>`
      ).join('');
    }
  }

  const { netto, mwst, brutto } = samplePreviewTotals();
  setText(previewRoot, '[data-preview-part="total-netto"]', formatEuro(netto));
  setText(previewRoot, '[data-preview-part="total-mwst"]', formatEuro(mwst));
  setText(previewRoot, '[data-preview-part="total-brutto"]', formatEuro(brutto));
}

export function bindPdfTemplatePreview(form, previewRoot, type, getVariant = () => 1) {
  if (!form || !previewRoot) return;
  const update = () => updatePdfTemplatePreview(form, previewRoot, type, getVariant());
  if (form.dataset.previewBound === 'true') {
    update();
    return;
  }
  form.dataset.previewBound = 'true';
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

export function mountPdfTemplateFormSections(container, type) {
  if (!container || container.dataset.mounted === type) return;
  container.innerHTML = getPdfTemplateFormSectionsHtml(type);
  container.dataset.mounted = type;
  const form = container.closest('form');
  if (form) delete form.dataset.sectionsEnhanced;
}

/** @deprecated Use mountPdfTemplateFormSections */
export function mountSharedPdfTemplateFields(container) {
  mountPdfTemplateFormSections(container, 'angebot');
}

export function getPdfTemplateFormSectionsHtml(type) {
  const isAngebot = type === 'angebot';
  const dokumentkopfFields = isAngebot
    ? `<label class="full">Dokumenttitel<input type="text" name="text-titel" placeholder="ANGEBOT" /></label>`
    : `<label class="full">Dokumenttitel<input type="text" name="rechnung-text-titel" autocomplete="off" /></label>
      <label>
        Zahlungsziel (Tage)
        <input type="number" name="rechnung-zahlungsziel-tage" min="0" max="365" step="1" />
      </label>`;
  const einleitungField = isAngebot
    ? `<label class="full">Einleitung<textarea name="text-einleitung" rows="2"></textarea></label>`
    : `<label class="full">Einleitung<textarea name="rechnung-text-einleitung" rows="2"></textarea></label>`;
  const fussTextFields = isAngebot
    ? `<label class="full">Abschlusstext 1<textarea name="text-fuss1" rows="2"></textarea></label>
      <label class="full">Abschlusstext 2<textarea name="text-fuss2" rows="2"></textarea></label>`
    : `<label class="full">Abschlusstext 1<textarea name="rechnung-text-fuss1" rows="2"></textarea></label>
      <label class="full">Abschlusstext 2<textarea name="rechnung-text-fuss2" rows="2"></textarea></label>`;

  return `
    <fieldset class="form-section" data-preview-region="briefkopf">
      <legend>Briefkopf</legend>
      <div class="form-grid">
        <div class="full image-upload-block">
          <span class="image-upload-label">Logo (links oben im Briefkopf)</span>
          <div class="image-upload-row">
            <input type="file" class="pdf-logo-file-input" accept="image/png,image/jpeg,image/webp" />
            <button type="button" class="btn btn-ghost btn-sm" data-clear-image="logo">Entfernen</button>
          </div>
          <p class="image-upload-hint">PNG, JPG oder WebP · max. 2&nbsp;MB</p>
          <div class="image-preview is-empty" data-preview="logo"></div>
          <div class="form-grid form-grid--compact">
            <label>Breite (mm)<input type="number" name="layout-logoBreiteMm" min="10" max="80" step="1" /></label>
            <label>Höhe (mm)<input type="number" name="layout-logoHoeheMm" min="8" max="40" step="1" /></label>
          </div>
        </div>
        <div class="full image-upload-block">
          <label class="checkbox-label">
            <input type="checkbox" name="layout-headerAktiv" />
            Header-Banner oben (volle Breite)
          </label>
          <div class="image-upload-row">
            <input type="file" class="pdf-header-file-input" accept="image/png,image/jpeg,image/webp" />
            <button type="button" class="btn btn-ghost btn-sm" data-clear-image="header">Entfernen</button>
          </div>
          <p class="image-upload-hint">PNG, JPG oder WebP · max. 2&nbsp;MB</p>
          <div class="image-preview is-empty" data-preview="header"></div>
          <label>Banner-Höhe (mm)<input type="number" name="layout-headerHoeheMm" min="10" max="50" step="1" /></label>
        </div>
        <label class="full">Firmenname<input type="text" name="firma-name" autocomplete="organization" /></label>
        <label class="full">Straße<input type="text" name="firma-strasse" /></label>
        <label>PLZ &amp; Ort<input type="text" name="firma-plzOrt" /></label>
        <label>Telefon<input type="text" name="firma-telefon" /></label>
        <label>E-Mail<input type="email" name="firma-email" autocomplete="email" /></label>
        <label>Webseite<input type="text" name="firma-web" /></label>
        <label class="full">USt-IdNr.<input type="text" name="firma-ustId" /></label>
        <label class="full">IBAN (ZUGFeRD)<input type="text" name="firma-iban" autocomplete="off" placeholder="DE89 3704 0044 0532 0130 00" /></label>
        <label>BIC<input type="text" name="firma-bic" autocomplete="off" placeholder="COBADEFFXXX" /></label>
        <label>Bank<input type="text" name="firma-bankName" autocomplete="organization" /></label>
        <label class="color-field full">Gedämpfter Text (Briefkopf)
          <span class="color-field-row"><input type="color" name="farbe-textMuted" /><input type="text" class="color-hex" data-sync-color="farbe-textMuted" /></span>
        </label>
        <label class="color-field full">Trennlinie
          <span class="color-field-row"><input type="color" name="farbe-trennlinie" /><input type="text" class="color-hex" data-sync-color="farbe-trennlinie" /></span>
        </label>
      </div>
    </fieldset>
    <fieldset class="form-section" data-preview-region="meta">
      <legend>Dokumentenkopf</legend>
      <div class="form-grid">
        ${dokumentkopfFields}
      </div>
    </fieldset>
    <fieldset class="form-section" data-preview-region="text">
      <legend>Einleitung</legend>
      <div class="form-grid">
        ${einleitungField}
      </div>
    </fieldset>
    <fieldset class="form-section" data-preview-region="table">
      <legend>Tabelle</legend>
      <div class="form-grid form-grid--colors">
        <label class="color-field full">Primärfarbe (Tabellenkopf)
          <span class="color-field-row">
            <input type="color" name="farbe-primaer" aria-label="Primärfarbe wählen" />
            <span class="color-value-field">
              <span class="color-value-field__label">HEX</span>
              <input type="text" class="color-hex" data-sync-color="farbe-primaer" placeholder="#1e3a5f" aria-label="Hex-Farbcode" />
            </span>
            <span class="color-value-field">
              <span class="color-value-field__label">RGB</span>
              <input type="text" class="color-rgb" data-sync-color-rgb="farbe-primaer" placeholder="30, 58, 95" aria-label="RGB-Farbwerte" />
            </span>
          </span>
        </label>
      </div>
    </fieldset>
    <fieldset class="form-section" data-preview-region="fuss">
      <legend>Fußbereich</legend>
      <div class="form-grid">
        ${fussTextFields}
        <label class="color-field full">Fußzeilen-Farbe
          <span class="color-field-row"><input type="color" name="farbe-fusszeile" /><input type="text" class="color-hex" data-sync-color="farbe-fusszeile" /></span>
        </label>
      </div>
      <div class="form-grid form-grid--fuss-spalten">
        <div class="fuss-spalte-form">
          <label>Überschrift Spalte 1<input type="text" name="fuss-spalte1-ueberschrift" /></label>
          <label class="full">Text Spalte 1<textarea name="fuss-spalte1-text" rows="3"></textarea></label>
        </div>
        <div class="fuss-spalte-form">
          <label>Überschrift Spalte 2<input type="text" name="fuss-spalte2-ueberschrift" /></label>
          <label class="full">Text Spalte 2<textarea name="fuss-spalte2-text" rows="3"></textarea></label>
        </div>
        <div class="fuss-spalte-form">
          <label>Überschrift Spalte 3<input type="text" name="fuss-spalte3-ueberschrift" /></label>
          <label class="full">Text Spalte 3<textarea name="fuss-spalte3-text" rows="3"></textarea></label>
        </div>
      </div>
    </fieldset>
  `;
}

/** @deprecated Use getPdfTemplateFormSectionsHtml */
export function getSharedPdfTemplateFieldsHtml() {
  return getPdfTemplateFormSectionsHtml('angebot');
}

