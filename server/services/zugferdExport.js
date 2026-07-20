import {
  embedFacturX,
  DocumentTypeCode,
  UnitCode,
  VatCategoryCode,
  Profile,
  Flavor,
} from '@stackforge-eu/factur-x';
import { normalizeAdresse } from '../../src/adresse.js';

const MWST_SATZ = 0.19;

const UNIT_CODE_MAP = {
  'stk.': UnitCode.EACH,
  stk: UnitCode.EACH,
  stück: UnitCode.EACH,
  stueck: UnitCode.EACH,
  'std.': UnitCode.HOUR,
  std: UnitCode.HOUR,
  stunde: UnitCode.HOUR,
  stunden: UnitCode.HOUR,
  h: UnitCode.HOUR,
  pausch: UnitCode.EACH,
  pauschal: UnitCode.EACH,
};

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function berechneSummen(postenDetails) {
  const netto = postenDetails.reduce((sum, p) => sum + Number(p.preis) * Number(p.menge), 0);
  const mwst = roundMoney(netto * MWST_SATZ);
  return { netto: roundMoney(netto), mwst, brutto: roundMoney(netto + mwst) };
}

function parsePlzOrt(plzOrt) {
  const text = String(plzOrt || '').trim();
  const match = text.match(/^(\d{4,5})\s+(.+)$/);
  if (match) {
    return { postalCode: match[1], city: match[2] };
  }
  return { postalCode: '', city: text };
}

function toIsoDate(value, fallback = new Date()) {
  const d = value ? new Date(value) : fallback;
  if (Number.isNaN(d.getTime())) {
    return fallback.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

function mapUnitCode(einheit) {
  const key = String(einheit || 'Stk.').trim().toLowerCase();
  return UNIT_CODE_MAP[key] || UnitCode.EACH;
}

function extractIbanFromText(text) {
  const match = String(text || '').match(/\b([A-Z]{2}\d{2}[A-Z0-9 ]{11,34})\b/i);
  return match ? match[1].replace(/\s/g, '').toUpperCase() : '';
}

function resolveSellerIban(template) {
  const direct = String(template?.firma?.iban || '').replace(/\s/g, '').toUpperCase();
  if (direct) return direct;

  for (const col of template?.fussSpalten || []) {
    const fromCol = extractIbanFromText(col.text);
    if (fromCol) return fromCol;
  }
  return '';
}

function buildAddress(party) {
  const addr = normalizeAdresse(party || {});
  const { postalCode, city } = parsePlzOrt(addr.plzOrt);
  return {
    line1: addr.strasse || party?.name || '—',
    city: city || '—',
    postalCode: postalCode || '00000',
    country: 'DE',
  };
}

export function buildZugferdInput(rechnung, postenDetails, template) {
  if (!rechnung?.rechnungNr) {
    throw new Error('Rechnungsnummer fehlt.');
  }
  if (!Array.isArray(postenDetails) || postenDetails.length === 0) {
    throw new Error('Mindestens eine Rechnungsposition ist erforderlich.');
  }

  const firma = template?.firma || {};
  const ustId = String(firma.ustId || '').trim();
  if (!ustId) {
    throw new Error('USt-IdNr. des Verkäufers fehlt in der PDF-Vorlage.');
  }

  const iban = resolveSellerIban(template);
  if (!iban) {
    throw new Error('IBAN fehlt — bitte in der PDF-Vorlage unter Briefkopf hinterlegen.');
  }

  const issueDate = toIsoDate(rechnung.rechnungsdatum || rechnung.erstelltAm);
  const dueDate = toIsoDate(rechnung.faelligAm, new Date(issueDate));
  const { netto, mwst, brutto } = berechneSummen(postenDetails);

  const lines = postenDetails.map((posten, index) => ({
    id: String(index + 1),
    name: posten.bezeichnung || `Position ${index + 1}`,
    description: posten.beschreibung || undefined,
    quantity: Number(posten.menge) || 0,
    unitCode: mapUnitCode(posten.einheit),
    unitPrice: roundMoney(Number(posten.preis) || 0),
    vatCategoryCode: VatCategoryCode.STANDARD_RATE,
    vatRatePercent: 19,
  }));

  const input = {
    document: {
      id: rechnung.rechnungNr,
      issueDate,
      typeCode: DocumentTypeCode.COMMERCIAL_INVOICE,
      buyerReference: rechnung.angebotNr || undefined,
    },
    seller: {
      name: firma.name || 'Verkäufer',
      address: buildAddress(firma),
      taxRegistrations: [{ id: ustId, schemeId: 'VA' }],
    },
    buyer: {
      name: rechnung.kunde?.name || 'Kunde',
      address: buildAddress(rechnung.kunde || {}),
    },
    delivery: { date: issueDate },
    lines,
    totals: {
      lineTotal: netto,
      taxBasisTotal: netto,
      taxTotal: mwst,
      grandTotal: brutto,
      duePayableAmount: brutto,
      currency: 'EUR',
    },
    vatBreakdown: [
      {
        categoryCode: VatCategoryCode.STANDARD_RATE,
        ratePercent: 19,
        taxableAmount: netto,
        taxAmount: mwst,
      },
    ],
    payment: {
      meansCode: '58',
      iban,
      bic: String(firma.bic || '').trim() || undefined,
      dueDate,
    },
  };

  return input;
}

export async function embedZugferdInPdf(pdfBuffer, rechnung, postenDetails, template) {
  const input = buildZugferdInput(rechnung, postenDetails, template);
  const profileName = String(template?.zugferd?.profile || 'EN16931').toUpperCase();
  const profile = profileName === 'BASIC' ? Profile.BASIC : Profile.EN16931;

  const result = await embedFacturX({
    pdf: pdfBuffer,
    input,
    profile,
    flavor: Flavor.ZUGFERD,
    validateXsd: false,
  });

  return {
    pdf: Buffer.from(result.pdf),
    profile: result.profile,
    xmlFilename: result.xmlFilename || 'factur-x.xml',
  };
}
