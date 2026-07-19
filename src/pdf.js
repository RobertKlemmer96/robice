import { jsPDF } from 'jspdf';

import autoTable from 'jspdf-autotable';

import {
  getPdfTemplate,

  hexToRgb,

  detectImageFormat,

} from './pdfTemplate.js';

import { adresseToLines } from './adresse.js';



const MWST_SATZ = 0.19;

function writeKundeAdressBlock(doc, kunde, startY) {
  let y = startY;
  const kundeName = kunde.name || 'Kunde';

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



export function formatMenge(menge) {

  return new Intl.NumberFormat('de-DE', {

    minimumFractionDigits: 0,

    maximumFractionDigits: 2,

  }).format(menge);

}



export function parsePreisInput(input) {

  const raw = String(input).trim();

  if (raw === '') return null;

  const num = Number(raw.replace(',', '.'));

  return Number.isFinite(num) ? num : NaN;

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



export function buildPdfDoc(angebot, postenDetails) {

  const tpl = getPdfTemplate();

  const { netto, mwst, brutto } = berechneSummenAusPosten(postenDetails);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });



  const erstelltAm = angebot.erstelltAm

    ? formatDatum(new Date(angebot.erstelltAm))

    : formatDatum(new Date());

  const gueltigBis = angebot.gueltigBis

    ? formatDatum(new Date(angebot.gueltigBis))

    : '—';



  const mutedRgb = hexToRgb(tpl.farben.textMuted);

  const lineRgb = hexToRgb(tpl.farben.trennlinie);

  const fussRgb = hexToRgb(tpl.farben.fusszeile);

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

  doc.text(`Datum: ${erstelltAm}`, 140, titelY + 16);

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



  const tableBody = postenDetails.map((p, index) => [

    String(index + 1),

    p.bezeichnung,

    p.beschreibung,

    String(formatMenge(p.menge)),

    p.einheit,

    formatEuro(p.preis),

    formatEuro(p.preis * p.menge),

  ]);



  autoTable(doc, {

    startY: y + 18,

    head: [['Pos', 'Bezeichnung', 'Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt']],

    body: tableBody,

    theme: 'grid',

    styles: { fontSize: 9, cellPadding: 3 },

    headStyles: { fillColor: primaerRgb, textColor: 255 },

    columnStyles: {

      0: { cellWidth: 12, halign: 'center' },

      3: { cellWidth: 16, halign: 'center' },

      4: { cellWidth: 18, halign: 'center' },

      5: { cellWidth: 28, halign: 'right' },

      6: { cellWidth: 28, halign: 'right' },

    },

    margin: { left: 20, right: 20 },

  });



  const endY = doc.lastAutoTable.finalY + 10;



  doc.setFont('helvetica', 'normal');

  doc.setFontSize(10);

  doc.setTextColor(0);

  doc.text('Nettobetrag:', 130, endY);

  doc.text(formatEuro(netto), 190, endY, { align: 'right' });

  doc.text('MwSt. 19 %:', 130, endY + 6);

  doc.text(formatEuro(mwst), 190, endY + 6, { align: 'right' });



  doc.setFont('helvetica', 'bold');

  doc.setFontSize(11);

  doc.text('Gesamtbetrag:', 130, endY + 14);

  doc.text(formatEuro(brutto), 190, endY + 14, { align: 'right' });



  doc.setFont('helvetica', 'normal');

  doc.setFontSize(8);

  doc.setTextColor(...fussRgb);

  const fussY = Math.min(endY + 30, 270);

  if (tpl.texte.fuss1) doc.text(tpl.texte.fuss1, 20, fussY);

  if (tpl.texte.fuss2) doc.text(tpl.texte.fuss2, 20, fussY + 5);



  return doc;

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
  const fussRgb = hexToRgb(tpl.farben.fusszeile);
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

  const tableBody = postenDetails.map((p, index) => [
    String(index + 1),
    p.bezeichnung,
    p.beschreibung,
    String(formatMenge(p.menge)),
    p.einheit,
    formatEuro(p.preis),
    formatEuro(p.preis * p.menge),
  ]);

  autoTable(doc, {
    startY: y + 18,
    head: [['Pos', 'Bezeichnung', 'Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: primaerRgb, textColor: 255 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  const endY = doc.lastAutoTable.finalY + 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('Nettobetrag:', 130, endY);
  doc.text(formatEuro(netto), 190, endY, { align: 'right' });
  doc.text('MwSt. 19 %:', 130, endY + 6);
  doc.text(formatEuro(mwst), 190, endY + 6, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Gesamtbetrag:', 130, endY + 14);
  doc.text(formatEuro(brutto), 190, endY + 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...fussRgb);
  const fussY = Math.min(endY + 30, 270);
  if (texte.fuss1) doc.text(texte.fuss1, 20, fussY);
  if (texte.fuss2) doc.text(texte.fuss2, 20, fussY + 5);

  return doc;
}

export function downloadRechnungPdf(rechnung, postenDetails) {
  const doc = buildRechnungPdfDoc(rechnung, postenDetails);
  const dateiname = `Rechnung_${rechnung.rechnungNr.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
  doc.save(dateiname);
}

export function openRechnungPdfPreview(rechnung, postenDetails) {
  const doc = buildRechnungPdfDoc(rechnung, postenDetails);
  const url = doc.output('bloburl');
  window.open(url, '_blank');
}


