export const PDF_LAYOUT_VARIANTS = {
  1: {
    id: 1,
    label: 'Klassisch',
    hint: 'Logo links, Dokumentdaten rechts — der bewährte Standard.',
  },
  2: {
    id: 2,
    label: 'Banner',
    hint: 'Großflächiger Farbbanner oben, Meta-Chips im Header, offene Positionsliste.',
  },
  3: {
    id: 3,
    label: 'Formbrief',
    hint: 'Geschäftsbrief mit Fensteranschrift, schmalem Briefkopf und reduzierter Tabelle.',
  },
};

export function normalizePdfLayoutVariant(value) {
  const variant = Number(value);
  return variant === 2 || variant === 3 ? variant : 1;
}

function wrapPdfLayoutPreviewFrame(sheetMarkup) {
  return `
    <div class="pdf-layout-preview__frame">
      <div class="pdf-layout-preview__labels pdf-layout-preview__labels--left" role="list" aria-label="PDF-Bereiche links"></div>
      ${sheetMarkup}
      <div class="pdf-layout-preview__labels pdf-layout-preview__labels--right" role="list" aria-label="PDF-Bereiche rechts"></div>
    </div>`;
}

function previewFussBlockV1() {
  return `
      <div class="pdf-layout-preview__region pdf-layout-preview__region--fuss" data-region="fuss">
        <span class="pdf-layout-preview__tag">Fußbereich</span>
        <div class="pdf-layout-preview__fuss-closing" data-preview-part="fuss-closing">
          <p data-preview-part="fuss1">Fußzeile 1</p>
          <p data-preview-part="fuss2">Fußzeile 2</p>
        </div>
        <hr class="pdf-layout-preview__line pdf-layout-preview__line--fuss" data-preview-part="fuss-trennlinie" />
        <div class="pdf-layout-preview__fuss-cols" data-preview-part="fuss-block">
          <div class="pdf-layout-preview__fuss-col">
            <strong data-preview-part="fuss-col1-header">Spalte 1</strong>
            <p data-preview-part="fuss-col1-text">Text</p>
          </div>
          <div class="pdf-layout-preview__fuss-col">
            <strong data-preview-part="fuss-col2-header">Spalte 2</strong>
            <p data-preview-part="fuss-col2-text">Text</p>
          </div>
          <div class="pdf-layout-preview__fuss-col">
            <strong data-preview-part="fuss-col3-header">Spalte 3</strong>
            <p data-preview-part="fuss-col3-text">Text</p>
          </div>
        </div>
      </div>`;
}

function previewTableBlockV1() {
  return `
      <div class="pdf-layout-preview__region pdf-layout-preview__region--table" data-region="table">
        <span class="pdf-layout-preview__tag">Tabelle</span>
        <table class="pdf-layout-preview__table">
          <thead data-preview-part="table-head">
            <tr><th>Pos</th><th>Tätigkeit</th><th>Art</th><th>Menge</th><th>Einh.</th><th>Preis</th><th>Gesamt</th></tr>
          </thead>
          <tbody data-preview-part="table-body"></tbody>
        </table>
        <div class="pdf-layout-preview__totals" data-preview-part="totals-box">
          <div class="pdf-layout-preview__total-row">
            <span>Gesamt netto</span>
            <span data-preview-part="total-netto">235,00 €</span>
          </div>
          <div class="pdf-layout-preview__total-row">
            <span>19&nbsp;% Umsatzsteuer</span>
            <span data-preview-part="total-mwst">44,65 €</span>
          </div>
          <div class="pdf-layout-preview__total-row pdf-layout-preview__total-row--bold">
            <span>Gesamtbetrag</span>
            <strong data-preview-part="total-brutto">279,65 €</strong>
          </div>
        </div>
      </div>`;
}

function createPdfLayoutPreviewMarkupV1(type) {
  const isAngebot = type === 'angebot';
  return wrapPdfLayoutPreviewFrame(`
    <div class="pdf-layout-preview__sheet pdf-layout-preview__sheet--v1" data-layout-variant="1">
      <div class="pdf-layout-preview__region pdf-layout-preview__region--banner hidden" data-preview-part="banner" data-region="briefkopf">
        <span class="pdf-layout-preview__tag">Header-Banner</span>
        <img alt="" class="pdf-layout-preview__banner-img hidden" />
      </div>
      <div class="pdf-layout-preview__header">
        <div class="pdf-layout-preview__region pdf-layout-preview__region--firma" data-region="briefkopf">
          <span class="pdf-layout-preview__tag">Briefkopf</span>
          <div class="pdf-layout-preview__firma" data-preview-part="firma-block">
            <div class="pdf-layout-preview__logo hidden" data-preview-part="logo"><img alt="" /></div>
            <strong class="pdf-layout-preview__firma-name" data-preview-part="logo-fallback">Firma</strong>
            <p data-preview-part="firma-strasse">Straße</p>
            <p data-preview-part="firma-plz">PLZ Ort</p>
            <div class="pdf-layout-preview__firma-kontakt pdf-layout-preview__small" data-preview-part="firma-kontakt">
              <p data-preview-part="firma-telefon">Tel.</p>
              <p data-preview-part="firma-email">E-Mail</p>
              <p data-preview-part="firma-ust">USt-IdNr.</p>
            </div>
          </div>
        </div>
        <div class="pdf-layout-preview__region pdf-layout-preview__region--meta" data-region="meta">
          <span class="pdf-layout-preview__tag">Dokumentenkopf</span>
          <div class="pdf-layout-preview__meta-block">
            <h3 class="pdf-layout-preview__doc-title" data-preview-part="doc-titel">${isAngebot ? 'ANGEBOT' : 'RECHNUNG'}</h3>
            <div class="pdf-layout-preview__meta-rows">
              <span class="pdf-layout-preview__meta-label" data-preview-part="meta-1-label"></span>
              <span class="pdf-layout-preview__meta-value" data-preview-part="meta-1-value"></span>
              <span class="pdf-layout-preview__meta-label" data-preview-part="meta-2-label"></span>
              <span class="pdf-layout-preview__meta-value" data-preview-part="meta-2-value"></span>
              <span class="pdf-layout-preview__meta-label" data-preview-part="meta-3-label"></span>
              <span class="pdf-layout-preview__meta-value" data-preview-part="meta-3-value"></span>
              <span class="pdf-layout-preview__meta-label pdf-layout-preview__small hidden" data-preview-part="meta-4-label"></span>
              <span class="pdf-layout-preview__meta-value pdf-layout-preview__small hidden" data-preview-part="meta-4-value"></span>
            </div>
          </div>
        </div>
      </div>
      <hr class="pdf-layout-preview__line" data-preview-part="trennlinie" data-region="briefkopf" />
      <div class="pdf-layout-preview__region pdf-layout-preview__region--kunde" data-region="kunde">
        <span class="pdf-layout-preview__tag">Empfänger</span>
        <strong data-preview-part="kunde-label">${isAngebot ? 'Angebot für:' : 'Rechnung an:'}</strong>
        <p class="pdf-layout-preview__kunde-name" data-preview-part="kunde-name">Musterkunde GmbH</p>
        <div class="pdf-layout-preview__kunde-adresse" data-preview-part="kunde-adresse"></div>
      </div>
      <div class="pdf-layout-preview__region pdf-layout-preview__region--text" data-region="text">
        <span class="pdf-layout-preview__tag">Einleitung</span>
        <p data-preview-part="einleitung">Einleitungstext</p>
      </div>
      ${previewTableBlockV1()}
      ${previewFussBlockV1()}
    </div>`);
}

function createPdfLayoutPreviewMarkupV2(type) {
  const isAngebot = type === 'angebot';
  return wrapPdfLayoutPreviewFrame(`
    <div class="pdf-layout-preview__sheet pdf-layout-preview__sheet--v2" data-layout-variant="2">
      <div class="pdf-layout-preview__hero" data-preview-part="hero" data-region="briefkopf">
        <span class="pdf-layout-preview__tag">Banner</span>
        <div class="pdf-layout-preview__hero-inner">
          <div class="pdf-layout-preview__hero-brand">
            <div class="pdf-layout-preview__logo pdf-layout-preview__logo--hero hidden" data-preview-part="logo"><img alt="" /></div>
            <strong class="pdf-layout-preview__hero-firma" data-preview-part="logo-fallback">Firma</strong>
            <div class="pdf-layout-preview__hero-contact" data-preview-part="firma-kontakt">
              <p data-preview-part="firma-telefon">Tel.</p>
              <p data-preview-part="firma-email">E-Mail</p>
            </div>
          </div>
          <h2 class="pdf-layout-preview__hero-title" data-preview-part="doc-titel">${isAngebot ? 'ANGEBOT' : 'RECHNUNG'}</h2>
        </div>
        <div class="pdf-layout-preview__hero-chips" data-region="meta">
          <span class="pdf-layout-preview__chip" data-preview-part="meta-1">Nr.</span>
          <span class="pdf-layout-preview__chip" data-preview-part="meta-2">Datum</span>
          <span class="pdf-layout-preview__chip" data-preview-part="meta-3">Termin</span>
          <span class="pdf-layout-preview__chip hidden" data-preview-part="meta-4">Bezug</span>
        </div>
      </div>
      <div class="pdf-layout-preview__banner-body">
        <div class="pdf-layout-preview__kunde-card" data-region="kunde">
          <span class="pdf-layout-preview__tag">Empfänger</span>
          <strong data-preview-part="kunde-label">${isAngebot ? 'Angebot für' : 'Rechnung an'}</strong>
          <p class="pdf-layout-preview__kunde-name" data-preview-part="kunde-name">Musterkunde GmbH</p>
          <div class="pdf-layout-preview__kunde-adresse" data-preview-part="kunde-adresse"></div>
        </div>
        <div class="pdf-layout-preview__region pdf-layout-preview__region--text" data-region="text">
          <span class="pdf-layout-preview__tag">Einleitung</span>
          <p data-preview-part="einleitung">Einleitungstext</p>
        </div>
        <div class="pdf-layout-preview__region pdf-layout-preview__region--table" data-region="table">
          <span class="pdf-layout-preview__tag">Tabelle</span>
          <table class="pdf-layout-preview__table pdf-layout-preview__table--open">
            <thead data-preview-part="table-head">
              <tr><th>Pos</th><th>Tätigkeit</th><th>Art</th><th>Menge</th><th>Preis</th><th>Gesamt</th></tr>
            </thead>
            <tbody data-preview-part="table-body"></tbody>
          </table>
          <div class="pdf-layout-preview__totals pdf-layout-preview__totals--banner" data-preview-part="totals-box">
            <div class="pdf-layout-preview__total-row">
              <span>Netto</span>
              <span data-preview-part="total-netto">235,00 €</span>
            </div>
            <div class="pdf-layout-preview__total-row">
              <span>MwSt.</span>
              <span data-preview-part="total-mwst">44,65 €</span>
            </div>
            <div class="pdf-layout-preview__total-row pdf-layout-preview__total-row--banner">
              <span>Gesamt</span>
              <strong data-preview-part="total-brutto">279,65 €</strong>
            </div>
          </div>
        </div>
        <div class="pdf-layout-preview__banner-fuss" data-region="fuss">
          <p data-preview-part="fuss1">Fußzeile 1</p>
          <p data-preview-part="fuss2">Fußzeile 2</p>
          <div class="pdf-layout-preview__fuss-cols pdf-layout-preview__fuss-cols--compact" data-preview-part="fuss-block">
            <div class="pdf-layout-preview__fuss-col">
              <strong data-preview-part="fuss-col1-header">Spalte 1</strong>
              <p data-preview-part="fuss-col1-text">Text</p>
            </div>
            <div class="pdf-layout-preview__fuss-col">
              <strong data-preview-part="fuss-col2-header">Spalte 2</strong>
              <p data-preview-part="fuss-col2-text">Text</p>
            </div>
            <div class="pdf-layout-preview__fuss-col">
              <strong data-preview-part="fuss-col3-header">Spalte 3</strong>
              <p data-preview-part="fuss-col3-text">Text</p>
            </div>
          </div>
        </div>
      </div>
    </div>`);
}

function createPdfLayoutPreviewMarkupV3(type) {
  const isAngebot = type === 'angebot';
  return wrapPdfLayoutPreviewFrame(`
    <div class="pdf-layout-preview__sheet pdf-layout-preview__sheet--v3" data-layout-variant="3">
      <header class="pdf-layout-preview__letterhead" data-region="briefkopf">
        <span class="pdf-layout-preview__tag">Briefkopf</span>
        <p class="pdf-layout-preview__letterhead-name" data-preview-part="logo-fallback">FIRMA</p>
        <p class="pdf-layout-preview__letterhead-line" data-preview-part="letterhead-address">Straße · PLZ Ort</p>
        <div class="pdf-layout-preview__letterhead-contact" data-preview-part="firma-kontakt">
          <p data-preview-part="firma-telefon">Tel.</p>
          <p data-preview-part="firma-email">E-Mail</p>
        </div>
      </header>
      <div class="pdf-layout-preview__letter-window">
        <div class="pdf-layout-preview__letter-address" data-region="kunde">
          <span class="pdf-layout-preview__tag">Fensteranschrift</span>
          <strong data-preview-part="kunde-label">${isAngebot ? 'Angebot für' : 'Rechnung an'}</strong>
          <p class="pdf-layout-preview__kunde-name" data-preview-part="kunde-name">Musterkunde GmbH</p>
          <div class="pdf-layout-preview__kunde-adresse" data-preview-part="kunde-adresse"></div>
        </div>
        <div class="pdf-layout-preview__letter-meta" data-region="meta">
          <span class="pdf-layout-preview__tag">Dokument</span>
          <div class="pdf-layout-preview__meta-block">
            <p class="pdf-layout-preview__letter-doc-type" data-preview-part="doc-titel">${isAngebot ? 'Angebot' : 'Rechnung'}</p>
            <div class="pdf-layout-preview__meta-rows">
              <span class="pdf-layout-preview__meta-label" data-preview-part="meta-1-label"></span>
              <span class="pdf-layout-preview__meta-value" data-preview-part="meta-1-value"></span>
              <span class="pdf-layout-preview__meta-label" data-preview-part="meta-2-label"></span>
              <span class="pdf-layout-preview__meta-value" data-preview-part="meta-2-value"></span>
              <span class="pdf-layout-preview__meta-label" data-preview-part="meta-3-label"></span>
              <span class="pdf-layout-preview__meta-value" data-preview-part="meta-3-value"></span>
              <span class="pdf-layout-preview__meta-label pdf-layout-preview__small hidden" data-preview-part="meta-4-label"></span>
              <span class="pdf-layout-preview__meta-value pdf-layout-preview__small hidden" data-preview-part="meta-4-value"></span>
            </div>
          </div>
        </div>
      </div>
      <hr class="pdf-layout-preview__letter-rule" data-preview-part="trennlinie" data-region="briefkopf" />
      <div class="pdf-layout-preview__region pdf-layout-preview__region--text pdf-layout-preview__region--text-v3" data-region="text">
        <span class="pdf-layout-preview__tag">Einleitung</span>
        <p data-preview-part="einleitung">Einleitungstext</p>
      </div>
      <div class="pdf-layout-preview__region pdf-layout-preview__region--table" data-region="table">
        <span class="pdf-layout-preview__tag">Tabelle</span>
        <table class="pdf-layout-preview__table pdf-layout-preview__table--letter">
          <thead data-preview-part="table-head">
            <tr><th>Pos.</th><th>Leistung</th><th>Menge</th><th>Betrag</th></tr>
          </thead>
          <tbody data-preview-part="table-body"></tbody>
        </table>
        <div class="pdf-layout-preview__totals pdf-layout-preview__totals--letter" data-preview-part="totals-box">
          <div class="pdf-layout-preview__total-row"><span>Netto</span><span data-preview-part="total-netto">235,00 €</span></div>
          <div class="pdf-layout-preview__total-row"><span>MwSt. 19&nbsp;%</span><span data-preview-part="total-mwst">44,65 €</span></div>
          <div class="pdf-layout-preview__total-row pdf-layout-preview__total-row--letter"><span>Gesamtbetrag</span><strong data-preview-part="total-brutto">279,65 €</strong></div>
        </div>
      </div>
      <div class="pdf-layout-preview__letter-fuss" data-region="fuss">
        <p data-preview-part="fuss1">Fußzeile 1</p>
        <p data-preview-part="fuss2">Fußzeile 2</p>
        <hr class="pdf-layout-preview__line pdf-layout-preview__line--fuss" data-preview-part="fuss-trennlinie" />
        <div class="pdf-layout-preview__fuss-cols pdf-layout-preview__fuss-cols--letter" data-preview-part="fuss-block">
          <div class="pdf-layout-preview__fuss-col">
            <strong data-preview-part="fuss-col1-header">Spalte 1</strong>
            <p data-preview-part="fuss-col1-text">Text</p>
          </div>
          <div class="pdf-layout-preview__fuss-col">
            <strong data-preview-part="fuss-col2-header">Spalte 2</strong>
            <p data-preview-part="fuss-col2-text">Text</p>
          </div>
        </div>
      </div>
    </div>`);
}

export function createPdfLayoutPreviewMarkup(type, variant = 1) {
  const normalized = normalizePdfLayoutVariant(variant);
  if (normalized === 2) return createPdfLayoutPreviewMarkupV2(type);
  if (normalized === 3) return createPdfLayoutPreviewMarkupV3(type);
  return createPdfLayoutPreviewMarkupV1(type);
}

export function applyPdfLayoutPreviewVariantStyles(previewRoot, variant, colors = {}) {
  if (!previewRoot) return;
  const { primaer = '#1e3a5f', lineColor = '#dcdcdc' } = colors;
  const normalized = normalizePdfLayoutVariant(variant);

  const hero = previewRoot.querySelector('[data-preview-part="hero"]');
  const kundeCard = previewRoot.querySelector('.pdf-layout-preview__kunde-card');
  const totalsBox = previewRoot.querySelector('[data-preview-part="totals-box"]');
  const trennlinie = previewRoot.querySelector('[data-preview-part="trennlinie"]');

  hero?.style.setProperty('background', `linear-gradient(135deg, ${primaer} 0%, color-mix(in srgb, ${primaer} 72%, #000) 100%)`);
  kundeCard?.style.setProperty('border-left-color', primaer);

  totalsBox?.style.removeProperty('background');
  totalsBox?.style.removeProperty('border-color');

  if (normalized === 2 && totalsBox) {
    totalsBox.style.background = `color-mix(in srgb, ${primaer} 12%, #fff)`;
    totalsBox.style.borderColor = `color-mix(in srgb, ${primaer} 35%, transparent)`;
  }

  if (trennlinie) {
    trennlinie.style.borderColor = normalized === 3 ? primaer : lineColor;
  }
}
