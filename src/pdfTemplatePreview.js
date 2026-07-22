import { previewAngebotsnummer, previewRechnungsnummer } from './dokumentnummer.js';
import { formatPostenArt } from './data.js';
import { applyI18n, getLocale, t } from './i18n.js';
import { normalizeAdresse } from './adresse.js';
import { berechneSummenAusPosten, formatDatum, formatEuro } from './pdf.js';
import { getFussSpalten, getPdfTemplate, mergePdfTemplate, withProfileFirma } from './pdfTemplate.js';
import { getSession } from './auth.js';
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
  { bez: 'Beratung vor Ort', art: 'Lohn', menge: 2, einheit: 'Std.', preis: 95, sum: '190,00 €' },
  { bez: 'Materialpauschale', art: 'Material', menge: 1, einheit: 'Stk.', preis: 45, sum: '45,00 €' },
];

function samplePreviewTotals() {
  return berechneSummenAusPosten(SAMPLE_POSTEN);
}

function formatPreviewDate(date) {
  const locale = getLocale() === 'en' ? 'en-US' : 'de-DE';
  return date.toLocaleDateString(locale);
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

function setFirmaKontakt(root, { telefon = '', email = '', ustId = '' } = {}) {
  const telLine = telefon ? `Tel: ${telefon}` : '';
  if (root.querySelector('[data-preview-part="firma-telefon"]')) {
    setText(root, '[data-preview-part="firma-telefon"]', telLine);
    setVisible(root, '[data-preview-part="firma-telefon"]', !!telefon);
  }
  if (root.querySelector('[data-preview-part="firma-email"]')) {
    setText(root, '[data-preview-part="firma-email"]', email);
    setVisible(root, '[data-preview-part="firma-email"]', !!email);
  }
  if (root.querySelector('[data-preview-part="firma-ust"]')) {
    setText(root, '[data-preview-part="firma-ust"]', ustId ? `USt-IdNr.: ${ustId}` : '');
    setVisible(root, '[data-preview-part="firma-ust"]', !!ustId);
  }
}

function setMetaRow(root, index, label, value) {
  setText(root, `[data-preview-part="meta-${index}-label"]`, `${label}:`);
  setText(root, `[data-preview-part="meta-${index}-value"]`, value || '—');
}

function setMetaChip(root, index, text) {
  setText(root, `[data-preview-part="meta-${index}"]`, text);
}

function setMetaRowVisible(root, index, visible) {
  setVisible(root, `[data-preview-part="meta-${index}-label"]`, visible);
  setVisible(root, `[data-preview-part="meta-${index}-value"]`, visible);
}

function applyPreviewMetaRows(root, layoutVariant, rows, { row4 = null, row4Visible = false } = {}) {
  const useChips = layoutVariant === 2;

  rows.forEach(([label, value], index) => {
    const rowIndex = index + 1;
    if (useChips) {
      setMetaChip(root, rowIndex, `${label}: ${value}`);
      return;
    }
    setMetaRow(root, rowIndex, label, value);
  });

  if (useChips) {
    setVisible(root, '[data-preview-part="meta-4"]', row4Visible);
    if (row4Visible && row4) setMetaChip(root, 4, row4);
    return;
  }

  setMetaRowVisible(root, 4, row4Visible);
  if (!row4Visible || !row4) return;

  if (typeof row4 === 'string') {
    setText(root, '[data-preview-part="meta-4-label"]', '');
    setText(root, '[data-preview-part="meta-4-value"]', row4);
    return;
  }

  setMetaRow(root, 4, row4.label, row4.value);
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
    !previewRoot.querySelector('.pdf-layout-preview__sheet') ||
    !previewRoot.querySelector('.pdf-layout-preview__labels--right') ||
    !previewRoot.querySelector('.pdf-layout-preview__meta-block')
  ) {
    previewRoot.innerHTML = createPdfLayoutPreviewMarkup(type, layoutVariant);
    previewRoot.dataset.previewType = type;
    previewRoot.dataset.previewVariant = String(layoutVariant);
    delete previewRoot.dataset.sectionClicksBound;
    delete previewRoot.dataset.labelsBound;
  }

  const firma = withProfileFirma(getPdfTemplate(), getSession()).firma;
  const firmaName = firma.name || 'Ihre Firma';
  const firmaStrasse = firma.strasse || 'Straße';
  const firmaPlzOrt = firma.plzOrt || 'PLZ Ort';
  const firmaTelefon = firma.telefon || '';
  const firmaEmail = firma.email || '';
  const firmaUst = firma.ustId || '';
  const primaer = readFormValue(form, 'farbe-primaer', '#1e3a5f');
  const textMuted = readFormValue(form, 'farbe-textMuted', '#505050');
  const fussfarbe = readFormValue(form, 'farbe-fusszeile', '#646464');
  const lineColor = readFormValue(form, 'farbe-trennlinie', '#dcdcdc');
  const klassischTable = {
    tabellenkopfText: readFormValue(form, 'farbe-tabellenkopfText', '#ffffff'),
    tabellenRand: readFormValue(form, 'farbe-tabellenRand', '#e5e7eb'),
    tabellenKoerperText: readFormValue(form, 'farbe-tabellenKoerperText', '#374151'),
    tabellenZebr: readFormValue(form, 'farbe-tabellenZebr', '#f3f4f6'),
    stil: readFormValue(form, 'layout-klassischTabellenStil', 'grid'),
    zebrAktiv: readFormValue(form, 'layout-klassischTabellenZebr', false),
  };
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
  setFirmaKontakt(previewRoot, {
    telefon: firmaTelefon,
    email: firmaEmail,
    ustId: firmaUst,
  });

  setText(previewRoot, '[data-preview-part="doc-titel"]', titel || (isAngebot ? 'ANGEBOT' : 'RECHNUNG'));
  setText(
    previewRoot,
    '[data-preview-part="kunde-label"]',
    isAngebot ? t('pdfPreview.quoteFor') : t('pdfPreview.invoiceTo')
  );
  setText(previewRoot, '[data-preview-part="einleitung"]', einleitung || t('pdfPreview.intro'));
  setText(previewRoot, '[data-preview-part="fuss1"]', fuss1 || t('pdfPreview.footer1'));
  setText(previewRoot, '[data-preview-part="fuss2"]', fuss2 || t('pdfPreview.footer2'));

  for (let index = 1; index <= 3; index += 1) {
    setText(
      previewRoot,
      `[data-preview-part="fuss-col${index}-header"]`,
      readFormValue(form, `fuss-spalte${index}-ueberschrift`, t('pdfPreview.column', { n: index }))
    );
    setText(
      previewRoot,
      `[data-preview-part="fuss-col${index}-text"]`,
      readFormValue(form, `fuss-spalte${index}-text`, t('pdfPreview.text'))
    );
  }

  if (isAngebot) {
    const schema = getPdfTemplate().angebot?.nummerSchema;
    const nr = schema
      ? previewAngebotsnummer(schema, new Date(), 1)
      : 'ANG-20260719-001';
    applyPreviewMetaRows(
      previewRoot,
      layoutVariant,
      [
        [t('pdfPreview.quoteNumber'), nr],
        [t('pdfPreview.quoteDate'), formatPreviewDate(new Date())],
        [t('pdfPreview.validUntil'), '31.08.2026'],
      ]
    );
  } else {
    const schema = getPdfTemplate().rechnung?.nummerSchema;
    const nr = schema
      ? previewRechnungsnummer(schema, new Date(), 1)
      : 'RE-20260719-001';
    applyPreviewMetaRows(
      previewRoot,
      layoutVariant,
      [
        [t('form.invoiceNumber'), nr],
        [t('form.invoiceDate'), formatPreviewDate(new Date())],
        [t('form.dueDate'), '02.08.2026'],
      ],
      {
        row4Visible: true,
        row4: t('pdfPreview.refQuote', { nr: 'ANG-20260719-001' }),
      }
    );
  }

  setText(previewRoot, '[data-preview-part="kunde-name"]', SAMPLE_KUNDE.name);
  setHtml(
    previewRoot,
    '[data-preview-part="kunde-adresse"]',
    SAMPLE_KUNDE.lines.map((line) => `<span>${line}</span>`).join('')
  );

  const tableHead = previewRoot.querySelector('[data-preview-part="table-head"]');
  stylePreviewTableHead(tableHead, layoutVariant, { primaer, lineColor, klassisch: klassischTable });

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
          <td>${row.art}</td>
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
          <td>${row.art}</td>
          <td>${row.menge}</td>
          <td>${row.einheit}</td>
          <td>${formatEuro(row.preis)}</td>
          <td>${row.sum}</td>
        </tr>`
      ).join('');
    }
  }

  stylePreviewTableBody(previewRoot.querySelector('[data-preview-part="table-body"]'), layoutVariant, klassischTable);

  const { netto, mwst, brutto } = samplePreviewTotals();
  setText(previewRoot, '[data-preview-part="total-netto"]', formatEuro(netto));
  setText(previewRoot, '[data-preview-part="total-mwst"]', formatEuro(mwst));
  setText(previewRoot, '[data-preview-part="total-brutto"]', formatEuro(brutto));

  syncPdfPreviewRegionLabels(previewRoot);
}

const PDF_PREVIEW_REGION_ORDER = ['briefkopf', 'meta', 'kunde', 'text', 'table', 'fuss'];

const PDF_PREVIEW_REGION_LABEL_SIDE = {
  meta: 'right',
};

const PDF_PREVIEW_REGION_LABEL_FALLBACK = {
  briefkopf: 'Briefkopf',
  meta: 'Dokumentenkopf',
  kunde: 'Empfänger',
  text: 'Einleitung',
  table: 'Tabelle',
  fuss: 'Fußbereich',
};

function isPdfPreviewRegionElementVisible(el) {
  if (!el || el.classList.contains('hidden')) return false;
  let node = el;
  while (node && node !== el.ownerDocument?.body) {
    if (node.classList?.contains('hidden')) return false;
    node = node.parentElement;
  }
  return el.getClientRects().length > 0;
}

function getPdfPreviewRegionLabelText(sheet, regionId) {
  const elements = [...sheet.querySelectorAll(`[data-region="${regionId}"]`)].filter(
    isPdfPreviewRegionElementVisible
  );
  for (const el of elements) {
    const tag = el.querySelector('.pdf-layout-preview__tag');
    const text = tag?.textContent?.trim();
    if (text) return text;
  }
  return PDF_PREVIEW_REGION_LABEL_FALLBACK[regionId] || regionId;
}

function computePdfPreviewRegionBounds(sheet, regionId) {
  const elements = [...sheet.querySelectorAll(`[data-region="${regionId}"]`)].filter(
    isPdfPreviewRegionElementVisible
  );
  if (!elements.length) return null;

  const sheetRect = sheet.getBoundingClientRect();
  let top = Infinity;
  let bottom = -Infinity;
  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    top = Math.min(top, rect.top);
    bottom = Math.max(bottom, rect.bottom);
  });
  if (!Number.isFinite(top)) return null;

  return {
    center: (top + bottom) / 2 - sheetRect.top,
  };
}

function getPdfPreviewRegionLabelSide(regionId) {
  return PDF_PREVIEW_REGION_LABEL_SIDE[regionId] || 'left';
}

function getPdfPreviewRegionLabelContainer(previewRoot, regionId) {
  const side = getPdfPreviewRegionLabelSide(regionId);
  return previewRoot.querySelector(`.pdf-layout-preview__labels--${side}`);
}

function positionPdfPreviewRegionLabelRail(labelsRoot, sheet) {
  if (!labelsRoot || !sheet) return;
  labelsRoot.style.minHeight = `${sheet.offsetHeight}px`;
  labelsRoot.querySelectorAll('.pdf-layout-preview__label').forEach((label) => {
    const bounds = computePdfPreviewRegionBounds(sheet, label.dataset.region);
    if (!bounds) {
      label.classList.add('hidden');
      return;
    }
    label.classList.remove('hidden');
    label.style.top = `${bounds.center}px`;
  });
}

export function positionPdfPreviewRegionLabels(previewRoot) {
  if (!previewRoot || previewRoot.dataset.documentPreview === 'true') return;
  const sheet = previewRoot.querySelector('.pdf-layout-preview__sheet');
  if (!sheet) return;

  positionPdfPreviewRegionLabelRail(
    previewRoot.querySelector('.pdf-layout-preview__labels--left'),
    sheet
  );
  positionPdfPreviewRegionLabelRail(
    previewRoot.querySelector('.pdf-layout-preview__labels--right'),
    sheet
  );
}

export function syncPdfPreviewRegionLabels(previewRoot) {
  if (!previewRoot || previewRoot.dataset.documentPreview === 'true') return;
  const sheet = previewRoot.querySelector('.pdf-layout-preview__sheet');
  const labelsLeft = previewRoot.querySelector('.pdf-layout-preview__labels--left');
  const labelsRight = previewRoot.querySelector('.pdf-layout-preview__labels--right');
  if (!sheet || !labelsLeft || !labelsRight) return;

  labelsLeft.replaceChildren();
  labelsRight.replaceChildren();
  PDF_PREVIEW_REGION_ORDER.forEach((regionId) => {
    const bounds = computePdfPreviewRegionBounds(sheet, regionId);
    const labelsRoot = getPdfPreviewRegionLabelContainer(previewRoot, regionId);
    if (!bounds || !labelsRoot) return;

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'pdf-layout-preview__label';
    label.dataset.region = regionId;
    label.textContent = getPdfPreviewRegionLabelText(sheet, regionId);
    label.classList.toggle(
      'is-clickable',
      previewRoot._pdfLabelOptions?.isClickable?.(regionId) ?? false
    );
    label.style.top = `${bounds.center}px`;
    labelsRoot.append(label);
  });

  positionPdfPreviewRegionLabels(previewRoot);
}

export function bindPdfPreviewRegionLabels(previewRoot, { onHover, onLeave, onClick, isClickable } = {}) {
  if (!previewRoot || previewRoot.dataset.documentPreview === 'true') return;
  previewRoot._pdfLabelOptions = { onHover, onLeave, onClick, isClickable };
  if (previewRoot.dataset.labelsBound === 'true') return;
  previewRoot.dataset.labelsBound = 'true';

  const frame = previewRoot.querySelector('.pdf-layout-preview__frame');
  const sheet = previewRoot.querySelector('.pdf-layout-preview__sheet');
  if (!frame) return;

  frame.addEventListener('mouseover', (event) => {
    const label = event.target.closest('.pdf-layout-preview__label');
    if (!label) return;
    onHover?.(label.dataset.region);
  });
  frame.addEventListener('mouseleave', (event) => {
    if (frame.contains(event.relatedTarget)) return;
    onLeave?.();
  });
  frame.addEventListener('click', (event) => {
    const label = event.target.closest('.pdf-layout-preview__label');
    if (!label) return;
    if (isClickable && !isClickable(label.dataset.region)) return;
    onClick?.(label.dataset.region);
  });

  if (sheet && !previewRoot._pdfLabelResizeObserver) {
    previewRoot._pdfLabelResizeObserver = new ResizeObserver(() => {
      positionPdfPreviewRegionLabels(previewRoot);
    });
    previewRoot._pdfLabelResizeObserver.observe(sheet);
  }
}

function escapePreviewHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDocumentPreviewDate(value) {
  if (!value) return '—';
  try {
    return formatDatum(new Date(value));
  } catch {
    return '—';
  }
}

function mapPreviewPostenRows(posten) {
  return posten.map((p) => ({
    bez: p.bezeichnung || '',
    art: formatPostenArt(p.art),
    menge: p.menge,
    einheit: p.einheit,
    preis: p.preis,
    sum: formatEuro((p.preis || 0) * (p.menge || 0)),
  }));
}

function renderPreviewTableBody(tbody, rows, layoutVariant) {
  if (!tbody) return;
  if (layoutVariant === 3) {
    tbody.innerHTML = rows
      .map(
        (row, i) => `
        <tr class="${i % 2 === 1 ? 'is-alt' : ''}">
          <td>${i + 1}.</td>
          <td>${escapePreviewHtml(row.bez)}</td>
          <td>${escapePreviewHtml(row.menge)} ${escapePreviewHtml(row.einheit)}</td>
          <td>${escapePreviewHtml(row.sum)}</td>
        </tr>`
      )
      .join('');
    return;
  }
  if (layoutVariant === 2) {
    tbody.innerHTML = rows
      .map(
        (row, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapePreviewHtml(row.bez)}</td>
          <td>${escapePreviewHtml(row.art)}</td>
          <td>${escapePreviewHtml(row.menge)}</td>
          <td>${formatEuro(row.preis)}</td>
          <td>${escapePreviewHtml(row.sum)}</td>
        </tr>`
      )
      .join('');
    return;
  }
  tbody.innerHTML = rows
    .map(
      (row, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapePreviewHtml(row.bez)}</td>
        <td>${escapePreviewHtml(row.art)}</td>
        <td>${escapePreviewHtml(row.menge)}</td>
        <td>${escapePreviewHtml(row.einheit)}</td>
        <td>${formatEuro(row.preis)}</td>
        <td>${escapePreviewHtml(row.sum)}</td>
      </tr>`
    )
    .join('');
}

function stylePreviewTableHead(tableHead, layoutVariant, { primaer, lineColor, klassisch } = {}) {
  if (!tableHead) return;
  tableHead.style.backgroundColor = '';
  tableHead.style.color = '';
  tableHead.style.borderBottom = '';
  tableHead.querySelectorAll('th').forEach((th) => {
    th.style.border = '';
    th.style.borderColor = '';
    th.style.backgroundColor = '';
    th.style.color = '';
    th.style.fontWeight = '';
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
    return;
  }

  if (layoutVariant === 3) {
    tableHead.style.backgroundColor = 'transparent';
    tableHead.style.color = '#374151';
    tableHead.style.borderBottom = `1px solid ${lineColor}`;
    tableHead.querySelectorAll('th').forEach((th) => {
      th.style.border = 'none';
      th.style.borderBottom = `1px solid ${lineColor}`;
      th.style.fontWeight = '600';
    });
    return;
  }

  const borderColor = klassisch?.tabellenRand || '#e5e7eb';
  const headTextColor = klassisch?.tabellenkopfText || '#ffffff';
  const plain = klassisch?.stil === 'plain';

  tableHead.style.backgroundColor = primaer;
  tableHead.style.color = headTextColor;
  tableHead.querySelectorAll('th').forEach((th) => {
    th.style.backgroundColor = primaer;
    th.style.color = headTextColor;
    th.style.borderColor = borderColor;
    if (plain) {
      th.style.border = 'none';
      th.style.borderBottom = `1px solid ${borderColor}`;
      th.style.fontWeight = '600';
    }
  });
}

function stylePreviewTableBody(tableBody, layoutVariant, klassisch) {
  if (!tableBody || layoutVariant !== 1 || !klassisch) return;

  const borderColor = klassisch.tabellenRand || '#e5e7eb';
  const bodyTextColor = klassisch.tabellenKoerperText || '#374151';
  const plain = klassisch.stil === 'plain';
  const zebrAktiv = !!klassisch.zebrAktiv;
  const zebrColor = klassisch.tabellenZebr || '#f3f4f6';

  tableBody.querySelectorAll('tr').forEach((row, index) => {
    row.style.color = bodyTextColor;
    row.style.backgroundColor = zebrAktiv && index % 2 === 1 ? zebrColor : '';
    row.querySelectorAll('td').forEach((cell) => {
      cell.style.color = bodyTextColor;
      cell.style.borderColor = borderColor;
      if (plain) {
        cell.style.border = 'none';
        cell.style.borderBottom = `1px solid ${borderColor}`;
      }
    });
  });
}

function klassischTableOptionsFromTemplate(tpl) {
  const farben = tpl?.farben || {};
  const layout = tpl?.layout || {};
  return {
    tabellenkopfText: farben.tabellenkopfText || '#ffffff',
    tabellenRand: farben.tabellenRand || '#e5e7eb',
    tabellenKoerperText: farben.tabellenKoerperText || '#374151',
    tabellenZebr: farben.tabellenZebr || '#f3f4f6',
    stil: layout.klassischTabellenStil === 'plain' ? 'plain' : 'grid',
    zebrAktiv: !!layout.klassischTabellenZebr,
  };
}

/** Live document preview (Angebot/Rechnung form) with real data. */
export function updateDocumentLayoutPreview(previewRoot, type, document, posten, template) {
  if (!previewRoot || !document) return;

  const tpl = withProfileFirma(mergePdfTemplate(template), getSession());
  const isAngebot = type === 'angebot';
  const variantKey = isAngebot ? 'angebotVariant' : 'rechnungVariant';
  const layoutVariant = normalizePdfLayoutVariant(tpl.layout?.[variantKey] ?? 1);

  previewRoot.innerHTML = createPdfLayoutPreviewMarkup(type, layoutVariant);
  previewRoot.dataset.previewType = type;
  previewRoot.dataset.previewVariant = String(layoutVariant);
  previewRoot.dataset.documentPreview = 'true';

  const firma = tpl.firma || {};
  const farben = tpl.farben || {};
  const texte = isAngebot ? tpl.texte || {} : tpl.texteRechnung || {};
  const fussSpalten = getFussSpalten(tpl);
  const primaer = farben.primaer || '#1e3a5f';
  const textMuted = farben.textMuted || '#505050';
  const fussfarbe = farben.fusszeile || '#646464';
  const lineColor = farben.trennlinie || '#dcdcdc';
  const headerActive = !!tpl.layout?.headerAktiv;
  const logoData = tpl.bilder?.logo || '';
  const headerData = tpl.bilder?.header || '';
  const kunde = document.kunde || {};
  const addr = normalizeAdresse(kunde);
  const kundeLines = [addr.strasse, addr.plzOrt].filter(Boolean);
  const rows = mapPreviewPostenRows(posten || []);

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
    setText(
      previewRoot,
      '[data-preview-part="logo-fallback"]',
      layoutVariant === 3 ? String(firma.name || '').toUpperCase() : firma.name || ''
    );
  }

  setText(previewRoot, '[data-preview-part="firma-strasse"]', firma.strasse || '');
  setText(previewRoot, '[data-preview-part="firma-plz"]', firma.plzOrt || '');
  setText(
    previewRoot,
    '[data-preview-part="letterhead-address"]',
    [firma.strasse, firma.plzOrt].filter(Boolean).join(' · ') || 'Adresse'
  );
  setText(
    previewRoot,
    '[data-preview-part="sender-text"]',
    [firma.name, firma.strasse, firma.plzOrt].filter(Boolean).join(' · ') || 'Absender'
  );
  setFirmaKontakt(previewRoot, {
    telefon: firma.telefon,
    email: firma.email,
    ustId: firma.ustId,
  });

  setText(previewRoot, '[data-preview-part="doc-titel"]', texte.titel || (isAngebot ? 'ANGEBOT' : 'RECHNUNG'));
  setText(
    previewRoot,
    '[data-preview-part="kunde-label"]',
    isAngebot ? t('pdfPreview.quoteFor') : t('pdfPreview.invoiceTo')
  );
  setText(previewRoot, '[data-preview-part="einleitung"]', texte.einleitung || t('pdfPreview.intro'));
  setText(previewRoot, '[data-preview-part="fuss1"]', texte.fuss1 || t('pdfPreview.footer1'));
  setText(previewRoot, '[data-preview-part="fuss2"]', texte.fuss2 || t('pdfPreview.footer2'));

  fussSpalten.forEach((col, index) => {
    const n = index + 1;
    setText(previewRoot, `[data-preview-part="fuss-col${n}-header"]`, col.ueberschrift || t('pdfPreview.column', { n }));
    setText(previewRoot, `[data-preview-part="fuss-col${n}-text"]`, col.text || t('pdfPreview.text'));
  });

  if (isAngebot) {
    applyPreviewMetaRows(
      previewRoot,
      layoutVariant,
      [
        [t('pdfPreview.quoteNumber'), document.angebotNr || '—'],
        [t('pdfPreview.quoteDate'), formatDocumentPreviewDate(document.angebotsdatum || document.erstelltAm)],
        [t('pdfPreview.validUntil'), formatDocumentPreviewDate(document.gueltigBis)],
      ]
    );
  } else {
    const hasRef = !!document.angebotNr;
    applyPreviewMetaRows(
      previewRoot,
      layoutVariant,
      [
        [t('form.invoiceNumber'), document.rechnungNr || '—'],
        [t('form.invoiceDate'), formatDocumentPreviewDate(document.rechnungsdatum || document.erstelltAm)],
        [t('form.dueDate'), formatDocumentPreviewDate(document.faelligAm)],
      ],
      {
        row4Visible: hasRef,
        row4: hasRef
          ? { label: t('pdfPreview.refQuoteLabel'), value: document.angebotNr }
          : null,
      }
    );
  }

  setText(previewRoot, '[data-preview-part="kunde-name"]', kunde.name || '—');
  setHtml(
    previewRoot,
    '[data-preview-part="kunde-adresse"]',
    kundeLines.map((line) => `<span>${escapePreviewHtml(line)}</span>`).join('')
  );

  const klassischTable = klassischTableOptionsFromTemplate(tpl);
  stylePreviewTableHead(previewRoot.querySelector('[data-preview-part="table-head"]'), layoutVariant, {
    primaer,
    lineColor,
    klassisch: klassischTable,
  });

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

  renderPreviewTableBody(previewRoot.querySelector('[data-preview-part="table-body"]'), rows, layoutVariant);
  stylePreviewTableBody(
    previewRoot.querySelector('[data-preview-part="table-body"]'),
    layoutVariant,
    klassischTable
  );

  const { netto, mwst, brutto } = berechneSummenAusPosten(posten || []);
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

const PDF_TEMPLATE_FORM_SECTIONS_VERSION = 'compact-v1';

export function mountPdfTemplateFormSections(container, type) {
  const mountKey = `${type}-${PDF_TEMPLATE_FORM_SECTIONS_VERSION}`;
  if (!container || container.dataset.mounted === mountKey) return;
  container.innerHTML = getPdfTemplateFormSectionsHtml(type);
  applyI18n(container);
  container.dataset.mounted = mountKey;
  const form = container.closest('form');
  if (form) delete form.dataset.sectionsEnhanced;
}

export function refreshPdfTemplateFormLabels(root = document) {
  root.querySelectorAll('[data-pdf-shared-fields]').forEach((container) => {
    if (container.dataset.mounted) applyI18n(container);
  });
}

/** @deprecated Use mountPdfTemplateFormSections */
export function mountSharedPdfTemplateFields(container) {
  mountPdfTemplateFormSections(container, 'angebot');
}

export function getPdfTemplateFormSectionsHtml(type) {
  const isAngebot = type === 'angebot';
  const dokumentkopfFields = isAngebot
    ? `<label class="full"><span data-i18n="pdfTpl.docTitle">Dokumenttitel</span><input type="text" name="text-titel" placeholder="ANGEBOT" /></label>`
    : `<label><span data-i18n="pdfTpl.docTitle">Dokumenttitel</span><input type="text" name="rechnung-text-titel" autocomplete="off" /></label>
      <label>
        <span data-i18n="pdfTpl.paymentTermsDays">Zahlungsziel (Tage)</span>
        <input type="number" name="rechnung-zahlungsziel-tage" min="0" max="365" step="1" />
      </label>`;
  const einleitungField = isAngebot
    ? `<label class="full"><span data-i18n="pdfTpl.introField">Einleitung</span><textarea name="text-einleitung" rows="2"></textarea></label>`
    : `<label class="full"><span data-i18n="pdfTpl.introField">Einleitung</span><textarea name="rechnung-text-einleitung" rows="2"></textarea></label>`;
  const fussTextFields = isAngebot
    ? `<label><span data-i18n="pdfTpl.closing1">Abschlusstext 1</span><textarea name="text-fuss1" rows="2"></textarea></label>
      <label><span data-i18n="pdfTpl.closing2">Abschlusstext 2</span><textarea name="text-fuss2" rows="2"></textarea></label>`
    : `<label><span data-i18n="pdfTpl.closing1">Abschlusstext 1</span><textarea name="rechnung-text-fuss1" rows="2"></textarea></label>
      <label><span data-i18n="pdfTpl.closing2">Abschlusstext 2</span><textarea name="rechnung-text-fuss2" rows="2"></textarea></label>`;

  const colorField = (name, labelKey, labelFallback, { klassisch = false, extraClass = '' } = {}) => `
        <label class="color-field ${klassisch ? 'pdf-klassisch-table-opt' : ''} ${extraClass}">
          <span data-i18n="${labelKey}">${labelFallback}</span>
          <span class="color-field-row color-field-row--compact">
            <input type="color" name="${name}" />
            <input type="text" class="color-hex" data-sync-color="${name}" />
          </span>
        </label>`;

  const colField = (index) => `
        <div class="fuss-spalte-form">
          <label><span data-i18n="pdfTpl.colHeader" data-i18n-params='{"n":${index}}'>Überschrift Spalte ${index}</span><input type="text" name="fuss-spalte${index}-ueberschrift" /></label>
          <label class="full"><span data-i18n="pdfTpl.colText" data-i18n-params='{"n":${index}}'>Text Spalte ${index}</span><textarea name="fuss-spalte${index}-text" rows="2"></textarea></label>
        </div>`;

  return `
    <fieldset class="form-section" data-preview-region="briefkopf">
      <legend data-i18n="pdfTpl.letterhead">Briefkopf</legend>
      <div class="form-grid form-grid--compact-pdf">
        <div class="full form-grid form-grid--upload-pair">
          <div class="image-upload-block">
            <span class="image-upload-label" data-i18n="pdfTpl.logoLabel">Logo (links oben im Briefkopf)</span>
            <div class="image-upload-row">
              <input type="file" class="pdf-logo-file-input" accept="image/png,image/jpeg,image/webp" />
              <button type="button" class="btn btn-ghost btn-sm" data-clear-image="logo" data-i18n="pdfTpl.remove">Entfernen</button>
            </div>
            <p class="image-upload-hint" data-i18n="pdfTpl.imageHint">PNG, JPG oder WebP · max. 2&nbsp;MB</p>
            <div class="image-preview is-empty" data-preview="logo"></div>
            <div class="form-grid form-grid--compact-pdf">
              <label><span data-i18n="pdfTpl.widthMm">Breite (mm)</span><input type="number" name="layout-logoBreiteMm" min="10" max="80" step="1" /></label>
              <label><span data-i18n="pdfTpl.heightMm">Höhe (mm)</span><input type="number" name="layout-logoHoeheMm" min="8" max="40" step="1" /></label>
            </div>
          </div>
          <div class="image-upload-block">
            <label class="checkbox-label">
              <input type="checkbox" name="layout-headerAktiv" />
              <span data-i18n="pdfTpl.headerBanner">Header-Banner oben (volle Breite)</span>
            </label>
            <div class="image-upload-row">
              <input type="file" class="pdf-header-file-input" accept="image/png,image/jpeg,image/webp" />
              <button type="button" class="btn btn-ghost btn-sm" data-clear-image="header" data-i18n="pdfTpl.remove">Entfernen</button>
            </div>
            <p class="image-upload-hint" data-i18n="pdfTpl.imageHint">PNG, JPG oder WebP · max. 2&nbsp;MB</p>
            <div class="image-preview is-empty" data-preview="header"></div>
            <label><span data-i18n="pdfTpl.bannerHeightMm">Banner-Höhe (mm)</span><input type="number" name="layout-headerHoeheMm" min="10" max="50" step="1" /></label>
          </div>
        </div>
        <p class="settings-lead full pdf-letterhead-profile-hint">
          <span data-i18n="pdfTpl.letterheadFromProfile">Firmendaten für den Briefkopf kommen aus Ihrem Profil.</span>
          <button type="button" class="btn btn-ghost btn-sm" data-nav-view="profil" data-i18n="pdfTpl.openProfile">Zum Profil</button>
        </p>
        <div class="full form-grid form-grid--colors form-grid--colors-2">
          ${colorField('farbe-textMuted', 'pdfTpl.mutedText', 'Gedämpfter Text (Briefkopf)')}
          ${colorField('farbe-trennlinie', 'pdfTpl.divider', 'Trennlinie')}
        </div>
      </div>
    </fieldset>
    <fieldset class="form-section" data-preview-region="meta">
      <legend data-i18n="pdfTpl.docHeader">Dokumentenkopf</legend>
      <div class="form-grid form-grid--compact-pdf">
        ${dokumentkopfFields}
      </div>
    </fieldset>
    <fieldset class="form-section" data-preview-region="text">
      <legend data-i18n="pdfTpl.introSection">Einleitung</legend>
      <div class="form-grid form-grid--compact-pdf">
        ${einleitungField}
      </div>
    </fieldset>
    <fieldset class="form-section" data-preview-region="table">
      <legend data-i18n="pdfTpl.tableSection">Tabelle</legend>
      <div class="form-grid form-grid--compact-pdf">
        <p class="settings-lead full pdf-klassisch-table-opt" data-i18n="pdfTpl.klassischTableHint">Diese Optionen gelten für das Layout „Klassisch“.</p>
        <label class="color-field full">
          <span data-i18n="pdfTpl.primaryColor">Primärfarbe (Tabellenkopf)</span>
          <span class="color-field-row color-field-row--compact color-field-row--primary">
            <input type="color" name="farbe-primaer" data-i18n-aria-label="pdfTpl.choosePrimaryColor" aria-label="Primärfarbe wählen" />
            <input type="text" class="color-hex" data-sync-color="farbe-primaer" placeholder="#1e3a5f" data-i18n-aria-label="pdfTpl.hexCode" aria-label="Hex-Farbcode" />
            <input type="text" class="color-rgb" data-sync-color-rgb="farbe-primaer" placeholder="30, 58, 95" data-i18n-aria-label="pdfTpl.rgbValues" aria-label="RGB-Farbwerte" />
          </span>
        </label>
        <div class="full form-grid form-grid--colors form-grid--colors-3 pdf-klassisch-table-opt">
          ${colorField('farbe-tabellenkopfText', 'pdfTpl.tableHeaderText', 'Textfarbe Tabellenkopf', { klassisch: true })}
          ${colorField('farbe-tabellenRand', 'pdfTpl.tableBorder', 'Rahmenfarbe', { klassisch: true })}
          ${colorField('farbe-tabellenKoerperText', 'pdfTpl.tableBodyText', 'Textfarbe Tabelleninhalt', { klassisch: true })}
          ${colorField('farbe-tabellenZebr', 'pdfTpl.tableZebraColor', 'Zeilenfarbe (alternierend)', { klassisch: true })}
        </div>
        <label class="pdf-klassisch-table-opt"><span data-i18n="pdfTpl.tableStyle">Tabellenstil</span>
          <select name="layout-klassischTabellenStil">
            <option value="grid" data-i18n="pdfTpl.tableStyleGrid">Gitter (Rahmen)</option>
            <option value="plain" data-i18n="pdfTpl.tableStylePlain">Nur Zeilenlinien</option>
          </select>
        </label>
        <label class="checkbox-label pdf-klassisch-table-opt">
          <input type="checkbox" name="layout-klassischTabellenZebr" />
          <span data-i18n="pdfTpl.tableZebra">Abwechselnde Zeilenfarbe</span>
        </label>
      </div>
    </fieldset>
    <fieldset class="form-section" data-preview-region="fuss">
      <legend data-i18n="pdfTpl.footerSection">Fußbereich</legend>
      <div class="form-grid form-grid--compact-pdf">
        ${fussTextFields}
        ${colorField('farbe-fusszeile', 'pdfTpl.footerColor', 'Fußzeilen-Farbe')}
      </div>
      <div class="form-grid form-grid--fuss-spalten form-grid--compact-pdf">
        ${colField(1)}
        ${colField(2)}
        ${colField(3)}
      </div>
    </fieldset>
  `;
}

/** @deprecated Use getPdfTemplateFormSectionsHtml */
export function getSharedPdfTemplateFieldsHtml() {
  return getPdfTemplateFormSectionsHtml('angebot');
}

