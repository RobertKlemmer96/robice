import { jsPDF } from 'jspdf';

import autoTable from 'jspdf-autotable';

import {
  getPdfTemplate,

  getFussSpalten,

  hexToRgb,

  detectImageFormat,

} from './pdfTemplate.js';

import { adresseToLines } from './adresse.js';
import { formatPostenArt } from './data.js';
import { formatKundeDisplayName } from './kundeStammdaten.js';
import { normalizePdfLayoutVariant } from './pdfLayoutVariants.js';



const MWST_SATZ = 0.19;

function writeKundeAdressBlock(doc, kunde, startY) {
  let y = startY;
  const kundeName = formatKundeDisplayName(kunde) || kunde.name || 'Kunde';

  doc.text(kundeName, 20, y);

  adresseToLines(kunde).forEach((zeile) => {
    y += 5;
    doc.text(zeile, 20, y);
  });

  const obj = kunde.objekt;
  if (obj && (obj.name || obj.adresse || obj.strasse || obj.plzOrt)) {
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Leistungsort:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (obj.name) {
      y += 5;
      doc.text(obj.name, 20, y);
    }
    adresseToLines(obj).forEach((zeile) => {
      y += 5;
      doc.text(zeile, 20, y);
    });
  }

  return y;
}

function renderPdfFooter(doc, tpl, { fuss1 = '', fuss2 = '' } = {}) {
  const lineRgb = hexToRgb(tpl.farben.trennlinie);
  const fussRgb = hexToRgb(tpl.farben.fusszeile);
  const mutedRgb = hexToRgb(tpl.farben.textMuted);
  const spalten = getFussSpalten(tpl);
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerLineY = pageHeight - 28;
  const left = 20;
  const right = 190;
  const colWidth = (right - left) / 3;

  if (fuss1 || fuss2) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...fussRgb);
    let closingY = footerLineY - 5;
    if (fuss2) {
      doc.text(fuss2, left, closingY);
      closingY -= 4;
    }
    if (fuss1) {
      doc.text(fuss1, left, closingY);
    }
  }

  doc.setDrawColor(...lineRgb);
  doc.setLineWidth(0.2);
  doc.line(left, footerLineY, right, footerLineY);

  spalten.forEach((col, index) => {
    const x = left + index * colWidth;
    const headerY = footerLineY + 4.5;
    const textY = headerY + 3.5;

    if (col.ueberschrift) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...mutedRgb);
      doc.text(col.ueberschrift, x, headerY);
    }

    if (col.text) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...fussRgb);
      const lines = doc.splitTextToSize(col.text, colWidth - 3);
      doc.text(lines, x, textY);
    }
  });
}



export function formatMenge(menge) {

  return new Intl.NumberFormat('de-DE', {

    minimumFractionDigits: 0,

    maximumFractionDigits: 2,

  }).format(menge);

}



export function parsePreisInput(input) {
  const raw = String(input ?? '').trim();
  if (raw === '') return null;
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(',', '.');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : NaN;
}

export function formatPreisInputDisplay(input) {
  const parsed = parsePreisInput(input);
  if (parsed === null || Number.isNaN(parsed)) return null;
  return formatEuro(Math.max(0, parsed));
}



export function parseMengeInput(input) {

  const raw = String(input).trim();

  if (raw === '') return null;

  const num = Number(raw.replace(',', '.'));

  return Number.isFinite(num) ? num : NaN;

}



export function formatEuro(betrag) {

  return new Intl.NumberFormat('de-DE', {

    style: 'currency',

    currency: 'EUR',

  }).format(betrag);

}



export function formatDatum(datum) {

  const d = datum instanceof Date ? datum : new Date(datum);

  if (Number.isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('de-DE', {

    day: '2-digit',

    month: '2-digit',

    year: 'numeric',

  }).format(d);

}



export function berechneSummenAusPosten(posten) {

  const netto = posten.reduce((sum, p) => sum + p.preis * p.menge, 0);

  const mwst = netto * MWST_SATZ;

  return { netto, mwst, brutto: netto + mwst };

}



function addTemplateImage(doc, dataUrl, x, y, w, h) {

  if (!dataUrl) return;

  try {

    doc.addImage(dataUrl, detectImageFormat(dataUrl), x, y, w, h);

  } catch {

    /* ungültiges Bild — überspringen */

  }

}



function buildPostenTableBody(postenDetails) {
  return postenDetails.map((p, index) => [
    String(index + 1),
    p.bezeichnung,
    formatPostenArt(p.art),
    p.beschreibung,
    String(formatMenge(p.menge)),
    p.einheit,
    formatEuro(p.preis),
    formatEuro(p.preis * p.menge),
  ]);
}

const TABLE_COLUMN_STYLES = {
  0: { cellWidth: 12, halign: 'center' },
  2: { cellWidth: 16, halign: 'center' },
  4: { cellWidth: 16, halign: 'center' },
  5: { cellWidth: 18, halign: 'center' },
  6: { cellWidth: 26, halign: 'right' },
  7: { cellWidth: 26, halign: 'right' },
};

function renderPdfTotalsBlock(
  doc,
  { netto, mwst, brutto },
  startY,
  variant,
  primaerRgb,
  labels = {}
) {
  const nettoLabel = labels.netto ?? 'Gesamt netto:';
  const mwstLabel = labels.mwst ?? 'Umsatzsteuer 19 %:';
  const bruttoLabel = labels.brutto ?? 'Gesamtbetrag:';

  if (variant === 2) {
    doc.setFillColor(primaerRgb[0], primaerRgb[1], primaerRgb[2], 0.08);
    doc.setDrawColor(primaerRgb[0], primaerRgb[1], primaerRgb[2]);
    doc.setLineWidth(0.2);
    doc.rect(122, startY - 4, 68, 24, 'FD');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(nettoLabel, 130, startY);
  doc.text(formatEuro(netto), 190, startY, { align: 'right' });
  doc.text(mwstLabel, 130, startY + 6);
  doc.text(formatEuro(mwst), 190, startY + 6, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(bruttoLabel, 130, startY + 14);
  doc.text(formatEuro(brutto), 190, startY + 14, { align: 'right' });
}

function renderPostenTable(doc, startY, tableBody, variant, primaerRgb, lineRgb) {
  const tableOptions = {
    startY,
    head: [['Pos', 'Bezeichnung', 'Art', 'Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt']],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: TABLE_COLUMN_STYLES,
    margin: { left: 20, right: 20, bottom: 38 },
  };

  if (variant === 2) {
    autoTable(doc, {
      ...tableOptions,
      theme: 'plain',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: primaerRgb,
        lineWidth: { bottom: 0.6 },
        lineColor: primaerRgb,
      },
      bodyStyles: { lineColor: lineRgb },
    });
    return;
  }

  if (variant === 3) {
    autoTable(doc, {
      ...tableOptions,
      theme: 'plain',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [55, 65, 81],
        lineWidth: { bottom: 0.4 },
        lineColor: lineRgb,
      },
      bodyStyles: {
        lineWidth: { bottom: 0.2 },
        lineColor: lineRgb,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    return;
  }

  autoTable(doc, {
    ...tableOptions,
    theme: 'grid',
    headStyles: { fillColor: primaerRgb, textColor: 255 },
  });
}

function buildAngebotPdfV2(angebot, postenDetails, tpl) {
  const { netto, mwst, brutto } = berechneSummenAusPosten(postenDetails);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const erstelltAm = angebot.angebotsdatum
    ? formatDatum(new Date(angebot.angebotsdatum))
    : angebot.erstelltAm
      ? formatDatum(new Date(angebot.erstelltAm))
      : formatDatum(new Date());
  const gueltigBis = angebot.gueltigBis ? formatDatum(new Date(angebot.gueltigBis)) : '—';
  const mutedRgb = hexToRgb(tpl.farben.textMuted);
  const lineRgb = hexToRgb(tpl.farben.trennlinie);
  const primaerRgb = hexToRgb(tpl.farben.primaer);
  const bannerH = 50;

  doc.setFillColor(...primaerRgb);
  doc.rect(0, 0, 210, bannerH, 'F');

  if (tpl.bilder.logo) {
    addTemplateImage(doc, tpl.bilder.logo, 20, 10, tpl.layout.logoBreiteMm, Math.min(tpl.layout.logoHoeheMm, 20));
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255);
    doc.text(tpl.firma.name, 20, 22);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255);
  doc.text(tpl.texte.titel || 'ANGEBOT', 190, 24, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255);
  doc.text(`${tpl.firma.telefon} · ${tpl.firma.email}`, 20, 30);

  const chips = [
    `Angebotsnr.: ${angebot.angebotNr}`,
    `Datum: ${erstelltAm}`,
    `Gültig bis: ${gueltigBis}`,
  ];
  let chipX = 20;
  const chipY = bannerH - 9;
  doc.setFontSize(7);
  chips.forEach((label) => {
    const chipW = doc.getTextWidth(label) + 8;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(chipX, chipY, chipW, 8, 2, 2, 'F');
    doc.setTextColor(40);
    doc.text(label, chipX + 4, chipY + 5.5);
    chipX += chipW + 4;
  });

  let y = bannerH + 12;
  doc.setFillColor(...primaerRgb);
  doc.rect(20, y, 2, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...mutedRgb);
  doc.text('ANGEBOT FÜR', 26, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0);
  y = writeKundeAdressBlock(doc, angebot.kunde, y + 9);

  if (tpl.texte.einleitung) {
    doc.setFontSize(10);
    doc.text(tpl.texte.einleitung, 20, y + 10);
    y += 10;
  }

  renderPostenTable(doc, y + 8, buildPostenTableBody(postenDetails), 2, primaerRgb, lineRgb);
  renderPdfTotalsBlock(doc, { netto, mwst, brutto }, doc.lastAutoTable.finalY + 10, 2, primaerRgb);
  renderPdfFooter(doc, tpl, { fuss1: tpl.texte.fuss1, fuss2: tpl.texte.fuss2 });
  return doc;
}

function buildAngebotPdfV3(angebot, postenDetails, tpl) {
  const { netto, mwst, brutto } = berechneSummenAusPosten(postenDetails);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const erstelltAm = angebot.angebotsdatum
    ? formatDatum(new Date(angebot.angebotsdatum))
    : angebot.erstelltAm
      ? formatDatum(new Date(angebot.erstelltAm))
      : formatDatum(new Date());
  const gueltigBis = angebot.gueltigBis ? formatDatum(new Date(angebot.gueltigBis)) : '—';
  const mutedRgb = hexToRgb(tpl.farben.textMuted);
  const lineRgb = hexToRgb(tpl.farben.trennlinie);
  const primaerRgb = hexToRgb(tpl.farben.primaer);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(String(tpl.firma.name || '').toUpperCase(), 105, 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedRgb);
  doc.text(`${tpl.firma.strasse} · ${tpl.firma.plzOrt}`, 105, 26, { align: 'center' });
  doc.text(`${tpl.firma.telefon} · ${tpl.firma.email}`, 105, 31, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(tpl.texte.titel || 'Angebot', 190, 48, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedRgb);
  doc.text(`Angebotsnr.: ${angebot.angebotNr}`, 190, 54, { align: 'right' });
  doc.text(`Angebotsdatum: ${erstelltAm}`, 190, 59, { align: 'right' });
  doc.text(`Gültig bis: ${gueltigBis}`, 190, 64, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedRgb);
  doc.text('Angebot für', 20, 50);
  doc.setFontSize(10);
  doc.setTextColor(0);
  let y = writeKundeAdressBlock(doc, angebot.kunde, 56);

  doc.setDrawColor(...primaerRgb);
  doc.setLineWidth(0.6);
  doc.line(20, y + 12, 190, y + 12);

  if (tpl.texte.einleitung) {
    doc.text(tpl.texte.einleitung, 20, y + 20);
    y += 8;
  }

  renderPostenTable(doc, y + 16, buildPostenTableBody(postenDetails), 3, primaerRgb, lineRgb);
  renderPdfTotalsBlock(doc, { netto, mwst, brutto }, doc.lastAutoTable.finalY + 10, 3, primaerRgb);
  renderPdfFooter(doc, tpl, { fuss1: tpl.texte.fuss1, fuss2: tpl.texte.fuss2 });
  return doc;
}

function buildAngebotPdfV1(angebot, postenDetails, tpl) {
  const { netto, mwst, brutto } = berechneSummenAusPosten(postenDetails);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const erstelltAm = angebot.angebotsdatum
    ? formatDatum(new Date(angebot.angebotsdatum))
    : angebot.erstelltAm
      ? formatDatum(new Date(angebot.erstelltAm))
      : formatDatum(new Date());

  const gueltigBis = angebot.gueltigBis

    ? formatDatum(new Date(angebot.gueltigBis))

    : '—';



  const mutedRgb = hexToRgb(tpl.farben.textMuted);

  const lineRgb = hexToRgb(tpl.farben.trennlinie);

  const primaerRgb = hexToRgb(tpl.farben.primaer);



  let yStart = 20;



  if (tpl.layout.headerAktiv && tpl.bilder.header) {

    addTemplateImage(doc, tpl.bilder.header, 0, 0, 210, tpl.layout.headerHoeheMm);

    yStart = tpl.layout.headerHoeheMm + 10;

  }



  let firmaBlockY = yStart;



  if (tpl.bilder.logo) {

    addTemplateImage(

      doc,

      tpl.bilder.logo,

      20,

      firmaBlockY,

      tpl.layout.logoBreiteMm,

      tpl.layout.logoHoeheMm

    );

    firmaBlockY += tpl.layout.logoHoeheMm + 4;

  } else {

    doc.setFont('helvetica', 'bold');

    doc.setFontSize(18);

    doc.setTextColor(0);

    doc.text(tpl.firma.name, 20, firmaBlockY + 2);

    firmaBlockY += 10;

  }



  doc.setFont('helvetica', 'normal');

  doc.setFontSize(9);

  doc.setTextColor(...mutedRgb);

  doc.text(tpl.firma.strasse, 20, firmaBlockY);

  doc.text(tpl.firma.plzOrt, 20, firmaBlockY + 5);

  doc.text(`Tel: ${tpl.firma.telefon}`, 20, firmaBlockY + 10);

  doc.text(`E-Mail: ${tpl.firma.email}`, 20, firmaBlockY + 15);

  doc.text(`USt-IdNr.: ${tpl.firma.ustId}`, 20, firmaBlockY + 20);



  const titelY = yStart + 2;

  doc.setTextColor(0);

  doc.setFont('helvetica', 'bold');

  doc.setFontSize(22);

  doc.text(tpl.texte.titel || 'ANGEBOT', 140, titelY);



  doc.setFont('helvetica', 'normal');

  doc.setFontSize(10);

  doc.text(`Angebotsnr.: ${angebot.angebotNr}`, 140, titelY + 10);

  doc.text(`Angebotsdatum: ${erstelltAm}`, 140, titelY + 16);

  doc.text(`Gültig bis: ${gueltigBis}`, 140, titelY + 22);



  const lineY = Math.max(firmaBlockY + 28, titelY + 30);

  doc.setDrawColor(...lineRgb);

  doc.line(20, lineY, 190, lineY);



  doc.setFont('helvetica', 'bold');

  doc.setFontSize(11);

  doc.setTextColor(0);

  doc.text('Angebot für:', 20, lineY + 10);



  doc.setFont('helvetica', 'normal');

  doc.setFontSize(10);

  let y = lineY + 16;

  y = writeKundeAdressBlock(doc, angebot.kunde, y);



  if (tpl.texte.einleitung) {

    doc.text(tpl.texte.einleitung, 20, y + 12);

  }



  const tableBody = buildPostenTableBody(postenDetails);

  renderPostenTable(doc, y + 18, tableBody, 1, primaerRgb, lineRgb);

  renderPdfTotalsBlock(doc, { netto, mwst, brutto }, doc.lastAutoTable.finalY + 10, 1, primaerRgb);

  renderPdfFooter(doc, tpl, { fuss1: tpl.texte.fuss1, fuss2: tpl.texte.fuss2 });

  return doc;
}

export function buildPdfDoc(angebot, postenDetails) {
  const tpl = getPdfTemplate();
  const variant = normalizePdfLayoutVariant(tpl.layout?.angebotVariant);
  if (variant === 2) return buildAngebotPdfV2(angebot, postenDetails, tpl);
  if (variant === 3) return buildAngebotPdfV3(angebot, postenDetails, tpl);
  return buildAngebotPdfV1(angebot, postenDetails, tpl);
}



export function downloadPdf(angebot, postenDetails) {

  const doc = buildPdfDoc(angebot, postenDetails);

  const dateiname = `Angebot_${angebot.angebotNr.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;

  doc.save(dateiname);

}



export function openPdfPreview(angebot, postenDetails) {

  const doc = buildPdfDoc(angebot, postenDetails);

  const url = doc.output('bloburl');

  window.open(url, '_blank');

}

export function buildRechnungPdfDoc(rechnung, postenDetails) {
  const tpl = getPdfTemplate();
  const variant = normalizePdfLayoutVariant(tpl.layout?.rechnungVariant);
  if (variant === 2) return buildRechnungPdfV2(rechnung, postenDetails, tpl);
  if (variant === 3) return buildRechnungPdfV3(rechnung, postenDetails, tpl);
  return buildRechnungPdfV1(rechnung, postenDetails, tpl);
}

const RECHNUNG_TOTAL_LABELS = {
  netto: 'Nettobetrag:',
  mwst: 'MwSt. 19 %:',
  brutto: 'Gesamtbetrag:',
};

function buildRechnungPdfV2(rechnung, postenDetails, tpl) {
  const texte = tpl.texteRechnung || {};
  const { netto, mwst, brutto } = berechneSummenAusPosten(postenDetails);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const rechnungsdatum = rechnung.rechnungsdatum
    ? formatDatum(new Date(rechnung.rechnungsdatum))
    : rechnung.erstelltAm
      ? formatDatum(new Date(rechnung.erstelltAm))
      : formatDatum(new Date());
  const faelligAm = rechnung.faelligAm ? formatDatum(new Date(rechnung.faelligAm)) : '—';
  const mutedRgb = hexToRgb(tpl.farben.textMuted);
  const lineRgb = hexToRgb(tpl.farben.trennlinie);
  const primaerRgb = hexToRgb(tpl.farben.primaer);
  const bannerH = 50;

  doc.setFillColor(...primaerRgb);
  doc.rect(0, 0, 210, bannerH, 'F');

  if (tpl.bilder.logo) {
    addTemplateImage(doc, tpl.bilder.logo, 20, 10, tpl.layout.logoBreiteMm, Math.min(tpl.layout.logoHoeheMm, 20));
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255);
    doc.text(tpl.firma.name, 20, 22);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255);
  doc.text(texte.titel || 'RECHNUNG', 190, 24, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255);
  doc.text(`${tpl.firma.telefon} · ${tpl.firma.email}`, 20, 30);

  const chips = [
    `Rechnungsnr.: ${rechnung.rechnungNr}`,
    `Datum: ${rechnungsdatum}`,
    `Fällig: ${faelligAm}`,
  ];
  let chipX = 20;
  const chipY = bannerH - 9;
  doc.setFontSize(7);
  chips.forEach((label) => {
    const chipW = doc.getTextWidth(label) + 8;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(chipX, chipY, chipW, 8, 2, 2, 'F');
    doc.setTextColor(40);
    doc.text(label, chipX + 4, chipY + 5.5);
    chipX += chipW + 4;
  });

  let y = bannerH + 12;
  doc.setFillColor(...primaerRgb);
  doc.rect(20, y, 2, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...mutedRgb);
  doc.text('RECHNUNG AN', 26, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0);
  y = writeKundeAdressBlock(doc, rechnung.kunde, y + 9);

  if (rechnung.angebotNr) {
    doc.setFontSize(9);
    doc.setTextColor(...mutedRgb);
    doc.text(`Bezug Angebot: ${rechnung.angebotNr}`, 26, y + 6);
    y += 6;
  }

  if (texte.einleitung) {
    doc.setFontSize(10);
    doc.text(texte.einleitung, 20, y + 10);
    y += 10;
  }

  renderPostenTable(doc, y + 8, buildPostenTableBody(postenDetails), 2, primaerRgb, lineRgb);
  renderPdfTotalsBlock(
    doc,
    { netto, mwst, brutto },
    doc.lastAutoTable.finalY + 10,
    2,
    primaerRgb,
    RECHNUNG_TOTAL_LABELS
  );
  renderPdfFooter(doc, tpl, { fuss1: texte.fuss1, fuss2: texte.fuss2 });
  return doc;
}

function buildRechnungPdfV3(rechnung, postenDetails, tpl) {
  const texte = tpl.texteRechnung || {};
  const { netto, mwst, brutto } = berechneSummenAusPosten(postenDetails);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const rechnungsdatum = rechnung.rechnungsdatum
    ? formatDatum(new Date(rechnung.rechnungsdatum))
    : rechnung.erstelltAm
      ? formatDatum(new Date(rechnung.erstelltAm))
      : formatDatum(new Date());
  const faelligAm = rechnung.faelligAm ? formatDatum(new Date(rechnung.faelligAm)) : '—';
  const mutedRgb = hexToRgb(tpl.farben.textMuted);
  const lineRgb = hexToRgb(tpl.farben.trennlinie);
  const primaerRgb = hexToRgb(tpl.farben.primaer);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(String(tpl.firma.name || '').toUpperCase(), 105, 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedRgb);
  doc.text(`${tpl.firma.strasse} · ${tpl.firma.plzOrt}`, 105, 26, { align: 'center' });
  doc.text(`${tpl.firma.telefon} · ${tpl.firma.email}`, 105, 31, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(texte.titel || 'Rechnung', 190, 48, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedRgb);
  doc.text(`Rechnungsnr.: ${rechnung.rechnungNr}`, 190, 54, { align: 'right' });
  doc.text(`Rechnungsdatum: ${rechnungsdatum}`, 190, 59, { align: 'right' });
  doc.text(`Fällig am: ${faelligAm}`, 190, 64, { align: 'right' });
  if (rechnung.angebotNr) {
    doc.text(`Bezug: ${rechnung.angebotNr}`, 190, 69, { align: 'right' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedRgb);
  doc.text('Rechnung an', 20, 50);
  doc.setFontSize(10);
  doc.setTextColor(0);
  let y = writeKundeAdressBlock(doc, rechnung.kunde, 56);

  doc.setDrawColor(...primaerRgb);
  doc.setLineWidth(0.6);
  doc.line(20, y + 12, 190, y + 12);

  if (texte.einleitung) {
    doc.text(texte.einleitung, 20, y + 20);
    y += 8;
  }

  renderPostenTable(doc, y + 16, buildPostenTableBody(postenDetails), 3, primaerRgb, lineRgb);
  renderPdfTotalsBlock(
    doc,
    { netto, mwst, brutto },
    doc.lastAutoTable.finalY + 10,
    3,
    primaerRgb,
    RECHNUNG_TOTAL_LABELS
  );
  renderPdfFooter(doc, tpl, { fuss1: texte.fuss1, fuss2: texte.fuss2 });
  return doc;
}

function buildRechnungPdfV1(rechnung, postenDetails, tpl) {
  const texte = tpl.texteRechnung || {};
  const { netto, mwst, brutto } = berechneSummenAusPosten(postenDetails);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const rechnungsdatum = rechnung.rechnungsdatum
    ? formatDatum(new Date(rechnung.rechnungsdatum))
    : rechnung.erstelltAm
      ? formatDatum(new Date(rechnung.erstelltAm))
      : formatDatum(new Date());

  const faelligAm = rechnung.faelligAm
    ? formatDatum(new Date(rechnung.faelligAm))
    : '—';

  const mutedRgb = hexToRgb(tpl.farben.textMuted);
  const lineRgb = hexToRgb(tpl.farben.trennlinie);
  const primaerRgb = hexToRgb(tpl.farben.primaer);

  let yStart = 20;

  if (tpl.layout.headerAktiv && tpl.bilder.header) {
    addTemplateImage(doc, tpl.bilder.header, 0, 0, 210, tpl.layout.headerHoeheMm);
    yStart = tpl.layout.headerHoeheMm + 10;
  }

  let firmaBlockY = yStart;

  if (tpl.bilder.logo) {
    addTemplateImage(
      doc,
      tpl.bilder.logo,
      20,
      firmaBlockY,
      tpl.layout.logoBreiteMm,
      tpl.layout.logoHoeheMm
    );
    firmaBlockY += tpl.layout.logoHoeheMm + 4;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text(tpl.firma.name, 20, firmaBlockY + 2);
    firmaBlockY += 10;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedRgb);
  doc.text(tpl.firma.strasse, 20, firmaBlockY);
  doc.text(tpl.firma.plzOrt, 20, firmaBlockY + 5);
  doc.text(`Tel: ${tpl.firma.telefon}`, 20, firmaBlockY + 10);
  doc.text(`E-Mail: ${tpl.firma.email}`, 20, firmaBlockY + 15);
  doc.text(`USt-IdNr.: ${tpl.firma.ustId}`, 20, firmaBlockY + 20);

  const titelY = yStart + 2;
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(texte.titel || 'RECHNUNG', 140, titelY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Rechnungsnr.: ${rechnung.rechnungNr}`, 140, titelY + 10);
  doc.text(`Rechnungsdatum: ${rechnungsdatum}`, 140, titelY + 16);
  doc.text(`Fällig am: ${faelligAm}`, 140, titelY + 22);

  const lineY = Math.max(firmaBlockY + 28, titelY + 30);
  doc.setDrawColor(...lineRgb);
  doc.line(20, lineY, 190, lineY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text('Rechnung an:', 20, lineY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let y = lineY + 16;
  y = writeKundeAdressBlock(doc, rechnung.kunde, y);

  if (rechnung.angebotNr) {
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(...mutedRgb);
    doc.text(`Bezug Angebot: ${rechnung.angebotNr}`, 20, y);
    doc.setFontSize(10);
    doc.setTextColor(0);
  }

  if (texte.einleitung) {
    doc.text(texte.einleitung, 20, y + 12);
  }

  const tableBody = buildPostenTableBody(postenDetails);

  renderPostenTable(doc, y + 18, tableBody, 1, primaerRgb, lineRgb);

  renderPdfTotalsBlock(
    doc,
    { netto, mwst, brutto },
    doc.lastAutoTable.finalY + 10,
    1,
    primaerRgb,
    RECHNUNG_TOTAL_LABELS
  );

  renderPdfFooter(doc, tpl, { fuss1: texte.fuss1, fuss2: texte.fuss2 });

  return doc;
}

import { exportRechnungZugferdPdf } from './rechnungen.js';

function downloadBlob(blob, dateiname) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = dateiname;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadRechnungPdf(rechnung, postenDetails) {
  const doc = buildRechnungPdfDoc(rechnung, postenDetails);
  const dateiname = `Rechnung_${rechnung.rechnungNr.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;

  try {
    const blob = await exportRechnungZugferdPdf(
      rechnung,
      postenDetails,
      doc.output('arraybuffer')
    );
    downloadBlob(blob, dateiname);
  } catch (err) {
    console.warn('ZUGFeRD-Export nicht verfügbar, Fallback auf Standard-PDF:', err);
    doc.save(dateiname);
  }
}

export async function openRechnungPdfPreview(rechnung, postenDetails) {
  const doc = buildRechnungPdfDoc(rechnung, postenDetails);

  try {
    const blob = await exportRechnungZugferdPdf(
      rechnung,
      postenDetails,
      doc.output('arraybuffer')
    );
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  } catch {
    const url = doc.output('bloburl');
    window.open(url, '_blank');
  }
}


