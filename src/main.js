import { initLanding } from './landing.js';
import { initLegal } from './legal.js';
import {
  normalizeAdresse,
  adresseToLines,
  setAdresseFieldPair,
  readAdresseFieldPair,
  clearAdresseFieldPair,
} from './adresse.js';
import {
  formatPlanLabel,
  normalizeRegistrationPlan,
  PLAN_LABELS,
  PLAN_PRICES,
  PLAN_TAGLINES,
  REGISTRATION_PLANS,
} from './plans.js';
import { login, logout, register, refreshSession, getCurrentUser, getCurrentTenant, getSession, changePassword, updateTenantName, isAdmin, isLoggedIn, needsOnboarding, deleteAccount } from './auth.js';
import { loadAdminUsers } from './adminUsers.js';
import { initOnboarding, openOnboarding, closeOnboarding } from './onboarding.js';
import { initKatalogModal } from './katalogModal.js';
import { initDatePickers } from './datePicker.js';
import { initTheme } from './theme.js';
import {
  getAllAngebote,
  getAngebot,
  saveAngebot,
  deleteAngebot,
  createAngebotId,
} from './angebote.js';
import {
  getAllKunden,
  getKunde,
  saveKunde,
  deleteKunde,
  createKundeId,
} from './kunden.js';
import {
  loadKatalogPosten,
  getKatalogPostenById,
  saveKatalogPosten,
  deleteKatalogPosten,
  createKatalogPostenId,
} from './katalogPosten.js';
import {
  listKundenObjekte,
  saveKundenObjekt,
  deleteKundenObjekt,
  createKundenObjektId,
} from './kundenObjekte.js';
import {
  getAllRechnungen,
  getRechnung,
  saveRechnung,
  deleteRechnung,
  createRechnungId,
} from './rechnungen.js';
import {
  formatEuro,
  formatDatum,
  parsePreisInput,
  formatPreisInputDisplay,
  berechneSummenAusPosten,
  downloadPdf,
  openPdfPreview,
  downloadRechnungPdf,
  openRechnungPdfPreview,
} from './pdf.js';
import {
  loadPdfTemplate,
  savePdfTemplate,
  getDefaultPdfTemplate,
  getPdfTemplate,
  templatePatchFromForm,
  templatePatchFromAngebotPage,
  templatePatchFromRechnungPage,
  fillPdfTemplateAngebotForm,
  fillPdfTemplateRechnungForm,
  readImageFileAsDataUrl,
  updateImagePreview,
  formatRgbFromHex,
  parseRgbInput,
  rgbToHex,
} from './pdfTemplate.js';
import {
  bindPdfTemplatePreview,
  createPdfLayoutPreviewMarkup,
  mountPdfTemplateFormSections,
  normalizePdfLayoutVariant,
  updatePdfTemplatePreview,
} from './pdfTemplatePreview.js';
import { PDF_LAYOUT_VARIANTS } from './pdfLayoutVariants.js';
import {
  generiereAngebotsnummer as erzeugeAngebotsnummer,
  previewAngebotsnummer,
  generiereRechnungsnummer as erzeugeRechnungsnummer,
  previewRechnungsnummer,
  schemaHasSequenceToken,
  getZahlungszielTage,
  addDaysIso,
} from './dokumentnummer.js';
import {
  createEditorState,
  createPostenEditor,
  resolvePostenDetails,
} from './postenEditor.js';

const PDF_VORLAGE_VIEWS = ['pdf-vorlage-angebot', 'pdf-vorlage-rechnung'];
const DOC_KOPF_LABEL = 'Allgemeine Informationen';

function isPdfVorlageView(view) {
  return PDF_VORLAGE_VIEWS.includes(view);
}

function pdfVorlageViewForBereich(view) {
  if (state.bereich === 'rechnungen' && view === 'pdf-vorlage-angebot') {
    return 'pdf-vorlage-rechnung';
  }
  if (state.bereich === 'angebote' && view === 'pdf-vorlage-rechnung') {
    return 'pdf-vorlage-angebot';
  }
  return view;
}

function resolvePdfVorlageView(view) {
  if (view === 'pdf-vorlage') {
    return state.bereich === 'rechnungen' ? 'pdf-vorlage-rechnung' : 'pdf-vorlage-angebot';
  }
  if (isPdfVorlageView(view)) {
    return pdfVorlageViewForBereich(view);
  }
  return view;
}

function syncPdfVorlageViews(activeView) {
  for (const viewId of PDF_VORLAGE_VIEWS) {
    document.getElementById(`view-${viewId}`)?.classList.toggle('hidden', activeView !== viewId);
  }
}

function createDocMeta() {
  return {
    editingId: null,
    selectedKundeId: null,
    selectedObjektId: null,
    selectedAdresseKey: null,
    objekt: null,
    objekteCache: [],
    billingAdresse: '',
    billingSnapshot: null,
  };
}

function createRechnungMeta() {
  return {
    ...createDocMeta(),
    angebotId: null,
    angebotNr: null,
  };
}

let pendingRegistrationPlan = 'free';

const BEREICH_STORAGE_KEY = 'klemdesk_bereich';

function loadSavedBereich() {
  return localStorage.getItem(BEREICH_STORAGE_KEY) === 'rechnungen' ? 'rechnungen' : 'angebote';
}

function saveBereich(bereich) {
  if (bereich === 'angebote' || bereich === 'rechnungen') {
    localStorage.setItem(BEREICH_STORAGE_KEY, bereich);
  }
}

function getDefaultViewForBereich(bereich = state.bereich) {
  return bereich === 'rechnungen' ? 'rechnung-neu' : 'neu';
}

const state = {
  appStarted: false,
  view: 'neu',
  lastNavBarView: 'neu',
  bereich: 'angebote',
  editingKundeId: null,
  detailKundeId: null,
  editingObjektId: null,
  kundenPickerSuche: '',
  kundenSuche: '',
  kundenPickerFor: 'angebot',
  expandedKundeDokumenteId: null,
  editingKatalogPostenId: null,
  katalogSuche: '',
  angebot: createDocMeta(),
  rechnung: createRechnungMeta(),
  pdfLayout: { angebot: 1, rechnung: 1 },
};

const angebotPostenState = createEditorState();
const rechnungPostenState = createEditorState();

const els = {
  landing: document.getElementById('landing'),
  loginScreen: document.getElementById('login-screen'),
  loginBackBtn: document.getElementById('login-back-btn'),
  app: document.getElementById('app'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  loginUser: document.getElementById('login-user'),
  loginPass: document.getElementById('login-pass'),
  loginError: document.getElementById('login-error'),
  registerTenant: document.getElementById('register-tenant'),
  registerEmail: document.getElementById('register-email'),
  registerPass: document.getElementById('register-pass'),
  registerError: document.getElementById('register-error'),
  registerPlanNote: document.getElementById('register-plan-note'),
  authTitle: document.getElementById('auth-title'),
  logoutBtn: document.getElementById('logout-btn'),
  profileBtn: document.getElementById('profile-btn'),
  mainNav: document.getElementById('main-nav'),
  navMobileToggle: document.getElementById('nav-mobile-toggle'),
  bereichSwitcher: document.getElementById('bereich-switcher'),
  bereichSwitcherWrap: document.getElementById('bereich-switcher-wrap'),
  bereichSwitcherMenu: document.getElementById('bereich-switcher-menu'),
  bereichSwitcherMark: document.getElementById('bereich-switcher-mark'),
  bereichSwitcherLabel: document.getElementById('bereich-switcher-label'),
  viewRechnungNeu: document.getElementById('view-rechnung-neu'),
  viewRechnungArchiv: document.getElementById('view-rechnung-archiv'),
  viewNeu: document.getElementById('view-neu'),
  viewArchiv: document.getElementById('view-archiv'),
  viewKunden: document.getElementById('view-kunden'),
  viewKatalog: document.getElementById('view-katalog'),
  pdfAngebotForm: document.getElementById('pdf-angebot-form'),
  pdfRechnungForm: document.getElementById('pdf-rechnung-form'),
  pdfPreviewAngebot: document.getElementById('pdf-preview-angebot'),
  pdfPreviewRechnung: document.getElementById('pdf-preview-rechnung'),
  viewProfil: document.getElementById('view-profil'),
  viewAdmin: document.getElementById('view-admin'),
  adminUserList: document.getElementById('admin-user-list'),
  profilAccountForm: document.getElementById('profil-account-form'),
  profilTenantName: document.getElementById('profil-tenant-name'),
  profilEmail: document.getElementById('profil-email'),
  profilPlan: document.getElementById('profil-plan'),
  profilPlanChangeBtn: document.getElementById('profil-plan-change-btn'),
  profilPlanModal: document.getElementById('profil-plan-modal'),
  profilPlanModalList: document.getElementById('profil-plan-modal-list'),
  profilPlanModalStatus: document.getElementById('profil-plan-modal-status'),
  profilAccountStatus: document.getElementById('profil-account-status'),
  profilPasswordForm: document.getElementById('profil-password-form'),
  profilCurrentPassword: document.getElementById('profil-current-password'),
  profilNewPassword: document.getElementById('profil-new-password'),
  profilConfirmPassword: document.getElementById('profil-confirm-password'),
  profilPasswordStatus: document.getElementById('profil-password-status'),
  profilNummernForm: document.getElementById('profil-nummern-form'),
  profilAngebotNummerSchema: document.getElementById('profil-angebot-nummer-schema'),
  profilRechnungNummerSchema: document.getElementById('profil-rechnung-nummer-schema'),
  profilAngebotSchemaPreview: document.getElementById('profil-angebot-schema-preview'),
  profilRechnungSchemaPreview: document.getElementById('profil-rechnung-schema-preview'),
  profilNummernStatus: document.getElementById('profil-nummern-status'),
  profilNummernActions: document.getElementById('profil-nummern-actions'),
  profilDeleteAccountBtn: document.getElementById('profil-delete-account-btn'),
  profilDeleteModal: document.getElementById('profil-delete-modal'),
  profilDeletePlz: document.getElementById('profil-delete-plz'),
  profilDeleteStatus: document.getElementById('profil-delete-status'),
  profilDeleteConfirmBtn: document.getElementById('profil-delete-confirm'),
  archivSuche: document.getElementById('archiv-suche'),
  archivListe: document.getElementById('archiv-liste'),
  resetBtn: document.getElementById('reset-btn'),
  pdfFooter: document.getElementById('pdf-footer'),
  angebotStickyFooter: document.getElementById('angebot-sticky-footer'),
  pdfBtn: document.getElementById('pdf-btn'),
  postenListe: document.getElementById('posten-liste'),
  zusammenfassung: document.getElementById('zusammenfassung'),
  summeNetto: document.getElementById('summe-netto'),
  summeMwst: document.getElementById('summe-mwst'),
  summeBrutto: document.getElementById('summe-brutto'),
  suche: document.getElementById('suche'),
  kundeName: document.getElementById('kunde-name'),
  kundeAuswahlBtn: document.getElementById('kunde-auswahl-btn'),
  kundeHinweis: document.getElementById('kunde-hinweis'),
  kundeStrasse: document.getElementById('kunde-strasse'),
  kundePlzOrt: document.getElementById('kunde-plz-ort'),
  kundeAdresseAuswahl: document.getElementById('kunde-adresse-auswahl'),
  kundeEinsatzortHinweis: document.getElementById('kunde-einsatzort-hinweis'),
  kundenModal: document.getElementById('kunden-modal'),
  kundenPickerSuche: document.getElementById('kunden-picker-suche'),
  kundenPickerListe: document.getElementById('kunden-picker-liste'),
  kundenForm: document.getElementById('kunden-form'),
  kundenFormTitle: document.getElementById('kunden-form-title'),
  kundenFormReset: document.getElementById('kunden-form-reset'),
  kundenFormName: document.getElementById('kunden-form-name'),
  kundenFormStrasse: document.getElementById('kunden-form-strasse'),
  kundenFormPlzOrt: document.getElementById('kunden-form-plz-ort'),
  kundenFormTelefon: document.getElementById('kunden-form-telefon'),
  kundenFormEmail: document.getElementById('kunden-form-email'),
  kundenFormNotiz: document.getElementById('kunden-form-notiz'),
  kundenFormSection: document.getElementById('kunden-form-section'),
  kundenDetail: document.getElementById('kunden-detail'),
  kundenDetailTitle: document.getElementById('kunden-detail-title'),
  kundenDetailAdresse: document.getElementById('kunden-detail-adresse'),
  kundenDetailTelefon: document.getElementById('kunden-detail-telefon'),
  kundenDetailEmail: document.getElementById('kunden-detail-email'),
  kundenDetailNotizWrap: document.getElementById('kunden-detail-notiz-wrap'),
  kundenDetailNotiz: document.getElementById('kunden-detail-notiz'),
  kundenDetailObjekteListe: document.getElementById('kunden-detail-objekte-liste'),
  kundenObjektForm: document.getElementById('kunden-objekt-form'),
  kundenObjektName: document.getElementById('kunden-objekt-name'),
  kundenObjektStrasse: document.getElementById('kunden-objekt-strasse'),
  kundenObjektPlzOrt: document.getElementById('kunden-objekt-plz-ort'),
  kundenObjektTyp: document.getElementById('kunden-objekt-typ'),
  kundenObjektCancel: document.getElementById('kunden-objekt-cancel'),
  kundenDetailDokumente: document.getElementById('kunden-detail-dokumente'),
  kundenDetailNeuAngebot: document.getElementById('kunden-detail-neu-angebot'),
  kundenDetailNeuRechnung: document.getElementById('kunden-detail-neu-rechnung'),
  kundenDetailEdit: document.getElementById('kunden-detail-edit'),
  kundenDetailClose: document.getElementById('kunden-detail-close'),
  kundenNeuBtn: document.getElementById('kunden-neu-btn'),
  kundenListe: document.getElementById('kunden-liste'),
  kundenSuche: document.getElementById('kunden-suche'),
  katalogForm: document.getElementById('katalog-form'),
  katalogFormSection: document.getElementById('katalog-form-section'),
  katalogFormTitle: document.getElementById('katalog-form-title'),
  katalogFormReset: document.getElementById('katalog-form-reset'),
  katalogFormBezeichnung: document.getElementById('katalog-form-bezeichnung'),
  katalogFormBeschreibung: document.getElementById('katalog-form-beschreibung'),
  katalogFormPreisStk: document.getElementById('katalog-form-preis-stk'),
  katalogFormPreisStd: document.getElementById('katalog-form-preis-std'),
  katalogNeuBtn: document.getElementById('katalog-neu-btn'),
  katalogListe: document.getElementById('katalog-liste'),
  katalogSuche: document.getElementById('katalog-suche'),
  angebotNr: document.getElementById('angebot-nr'),
  angebotDatum: document.getElementById('angebot-datum'),
  gueltigBis: document.getElementById('gueltig-bis'),
  angebotKopf: document.getElementById('angebot-kopf'),
  angebotKopfToggle: document.getElementById('angebot-kopf-toggle'),
  angebotKopfSummaryMeta: document.getElementById('angebot-kopf-summary-meta'),
  angebotKopfSummaryKunde: document.getElementById('angebot-kopf-summary-kunde'),
  postenKopf: document.getElementById('posten-kopf'),
  postenKopfToggle: document.getElementById('posten-kopf-toggle'),
  postenKopfSummaryMeta: document.getElementById('posten-kopf-summary-meta'),
  postenKopfSummaryCount: document.getElementById('posten-kopf-summary-count'),
  postenKopfBody: document.getElementById('posten-kopf-body'),
  rechnungResetBtn: document.getElementById('rechnung-reset-btn'),
  rechnungStickyFooter: document.getElementById('rechnung-sticky-footer'),
  rechnungPdfBtn: document.getElementById('rechnung-pdf-btn'),
  rechnungKopf: document.getElementById('rechnung-kopf'),
  rechnungKopfToggle: document.getElementById('rechnung-kopf-toggle'),
  rechnungKopfSummaryMeta: document.getElementById('rechnung-kopf-summary-meta'),
  rechnungKopfSummaryKunde: document.getElementById('rechnung-kopf-summary-kunde'),
  rechnungPostenKopf: document.getElementById('rechnung-posten-kopf'),
  rechnungPostenKopfToggle: document.getElementById('rechnung-posten-kopf-toggle'),
  rechnungPostenKopfSummaryCount: document.getElementById('rechnung-posten-kopf-summary-count'),
  rechnungPostenKopfBody: document.getElementById('rechnung-posten-kopf-body'),
  rechnungPostenListe: document.getElementById('rechnung-posten-liste'),
  rechnungSummeNetto: document.getElementById('rechnung-summe-netto'),
  rechnungSummeMwst: document.getElementById('rechnung-summe-mwst'),
  rechnungSummeBrutto: document.getElementById('rechnung-summe-brutto'),
  rechnungSuche: document.getElementById('rechnung-suche'),
  rechnungKundeName: document.getElementById('rechnung-kunde-name'),
  rechnungKundeAuswahlBtn: document.getElementById('rechnung-kunde-auswahl-btn'),
  rechnungKundeHinweis: document.getElementById('rechnung-kunde-hinweis'),
  rechnungKundeStrasse: document.getElementById('rechnung-kunde-strasse'),
  rechnungKundePlzOrt: document.getElementById('rechnung-kunde-plz-ort'),
  rechnungAdresseAuswahl: document.getElementById('rechnung-adresse-auswahl'),
  rechnungEinsatzortHinweis: document.getElementById('rechnung-einsatzort-hinweis'),
  rechnungNr: document.getElementById('rechnung-nr'),
  rechnungDatum: document.getElementById('rechnung-datum'),
  rechnungFaellig: document.getElementById('rechnung-faellig'),
  rechnungAngebotRef: document.getElementById('rechnung-angebot-ref'),
  rechnungArchivSuche: document.getElementById('rechnung-archiv-suche'),
  rechnungArchivListe: document.getElementById('rechnung-archiv-liste'),
  katalogOeffnenBtn: document.getElementById('katalog-oeffnen-btn'),
  rechnungKatalogOeffnenBtn: document.getElementById('rechnung-katalog-oeffnen-btn'),
  katalogModal: document.getElementById('katalog-modal'),
  katalogModalListe: document.getElementById('katalog-modal-liste'),
  katalogModalSuche: document.getElementById('katalog-modal-suche'),
};

const angebotPostenEditor = createPostenEditor(angebotPostenState, {
  postenListe: els.postenListe,
  suche: els.suche,
  zusammenfassung: els.zusammenfassung,
  summeNetto: els.summeNetto,
  summeMwst: els.summeMwst,
  summeBrutto: els.summeBrutto,
  pdfBtn: els.pdfBtn,
  canSave: () => isAngebotKopfComplete(),
  onUpdate: () => updatePostenKopfSummary(),
});

const rechnungPostenEditor = createPostenEditor(rechnungPostenState, {
  postenListe: els.rechnungPostenListe,
  suche: els.rechnungSuche,
  summeNetto: els.rechnungSummeNetto,
  summeMwst: els.rechnungSummeMwst,
  summeBrutto: els.rechnungSummeBrutto,
  pdfBtn: els.rechnungPdfBtn,
  canSave: () => isRechnungKopfComplete(),
  onUpdate: () => updateRechnungPostenKopfSummary(),
});

async function generiereAngebotsnummer() {
  return erzeugeAngebotsnummer(getAllAngebote);
}

async function generiereRechnungsnummer() {
  return erzeugeRechnungsnummer(getAllRechnungen);
}

function normalizeKundeName(name) {
  return (name || '').trim().toLowerCase();
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAdresseHtml(adresseLike) {
  return adresseToLines(adresseLike)
    .map((line) => escapeHtml(line))
    .join('<br>');
}

function formatAdresseInline(adresseLike) {
  return adresseToLines(adresseLike).join(', ');
}

function angebotAdresseFields() {
  return { strasseEl: els.kundeStrasse, plzOrtEl: els.kundePlzOrt };
}

function rechnungAdresseFields() {
  return { strasseEl: els.rechnungKundeStrasse, plzOrtEl: els.rechnungKundePlzOrt };
}

function kundeMatchesSearch(k, q) {
  if (!q) return true;
  const addr = normalizeAdresse(k);
  return (
    k.name.toLowerCase().includes(q) ||
    (k.adresse || '').toLowerCase().includes(q) ||
    addr.strasse.toLowerCase().includes(q) ||
    addr.plzOrt.toLowerCase().includes(q) ||
    (k.telefon || '').toLowerCase().includes(q) ||
    (k.email || '').toLowerCase().includes(q) ||
    (k.notiz || '').toLowerCase().includes(q)
  );
}

function setKundenDetailContact(el, value, kind) {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    el.textContent = '—';
    return;
  }
  const safe = escapeHtml(trimmed);
  if (kind === 'tel') {
    el.innerHTML = `<a href="tel:${encodeURIComponent(trimmed)}">${safe}</a>`;
  } else {
    el.innerHTML = `<a href="mailto:${encodeURIComponent(trimmed)}">${safe}</a>`;
  }
}

const OBJEKT_TYP_LABELS = {
  einsatz: 'Einsatzort',
  rechnung: 'Adresse (alternativ)',
};

function clearObjektMeta(meta) {
  meta.selectedObjektId = null;
  meta.selectedAdresseKey = null;
  meta.objekt = null;
  meta.objekteCache = [];
  meta.billingAdresse = '';
  meta.billingSnapshot = null;
}

function setBillingSnapshot(meta, adresseLike) {
  meta.billingSnapshot = normalizeAdresse(adresseLike);
  meta.billingAdresse = meta.billingSnapshot.adresse;
}

function updateEinsatzortHinweis(hinweisEl, meta) {
  if (!hinweisEl) return;
  if (meta.objekt?.typ === 'einsatz' && meta.objekt.name) {
    hinweisEl.textContent = `Leistungsort: ${meta.objekt.name}`;
    hinweisEl.classList.remove('hidden');
    return;
  }
  hinweisEl.textContent = '';
  hinweisEl.classList.add('hidden');
}

function renderAdresseAuswahlHtml(meta) {
  const selected = meta.selectedAdresseKey;
  const parts = [];

  if (meta.billingSnapshot?.adresse || meta.billingSnapshot?.strasse || meta.billingSnapshot?.plzOrt) {
    parts.push(`
      <button type="button" class="adresse-auswahl__item${selected === 'billing' ? ' is-active' : ''}" data-adresse-key="billing">
        <span class="adresse-auswahl__label">Adresse</span>
        <span class="adresse-auswahl__text">${escapeHtml(formatAdresseInline(meta.billingSnapshot)) || '—'}</span>
      </button>
    `);
  }

  meta.objekteCache.forEach((obj) => {
    const badge = OBJEKT_TYP_LABELS[obj.typ] || obj.typ;
    parts.push(`
      <button type="button" class="adresse-auswahl__item${selected === obj.id ? ' is-active' : ''}" data-adresse-key="${escapeHtml(obj.id)}">
        <span class="adresse-auswahl__label">${escapeHtml(obj.name)}<span class="adresse-auswahl__badge">${escapeHtml(badge)}</span></span>
        <span class="adresse-auswahl__text">${escapeHtml(formatAdresseInline(obj)) || '—'}</span>
      </button>
    `);
  });

  return parts.join('');
}

function syncAdresseAuswahlActive(pickerEl, meta) {
  if (!pickerEl) return;
  pickerEl.querySelectorAll('.adresse-auswahl__item').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.adresseKey === meta.selectedAdresseKey);
  });
}

function selectAdresseOption(meta, key, adresseFields, hinweisEl) {
  const { strasseEl, plzOrtEl } = adresseFields;

  if (!key || key === 'billing') {
    meta.selectedAdresseKey = 'billing';
    meta.selectedObjektId = null;
    meta.objekt = null;
    if (meta.billingSnapshot) {
      setAdresseFieldPair(strasseEl, plzOrtEl, meta.billingSnapshot);
    }
    updateEinsatzortHinweis(hinweisEl, meta);
    return;
  }

  const obj = meta.objekteCache.find((o) => o.id === key);
  if (!obj) return;

  const objAddr = normalizeAdresse(obj);
  meta.selectedAdresseKey = obj.id;
  meta.selectedObjektId = obj.id;

  if (obj.typ === 'rechnung') {
    meta.objekt = null;
    setAdresseFieldPair(strasseEl, plzOrtEl, objAddr);
  } else {
    meta.objekt = { typ: 'einsatz', name: obj.name, ...objAddr };
    if (meta.billingSnapshot) {
      setAdresseFieldPair(strasseEl, plzOrtEl, meta.billingSnapshot);
    }
  }

  updateEinsatzortHinweis(hinweisEl, meta);
}

async function refreshAdresseAuswahl(kundeId, pickerEl, hinweisEl, meta, adresseFields) {
  if (!pickerEl) return;

  if (!kundeId) {
    meta.objekteCache = [];
    pickerEl.innerHTML = '';
    pickerEl.classList.add('hidden');
    updateEinsatzortHinweis(hinweisEl, meta);
    return;
  }

  meta.objekteCache = await listKundenObjekte(kundeId);
  pickerEl.innerHTML = '';
  pickerEl.classList.add('hidden');
  updateEinsatzortHinweis(hinweisEl, meta);
}

function addressesEqual(a, b) {
  const left = normalizeAdresse(a);
  const right = normalizeAdresse(b);
  return left.strasse === right.strasse && left.plzOrt === right.plzOrt;
}

async function restoreAdresseFromDocument(kundeId, kundeJson, pickerEl, hinweisEl, meta, adresseFields) {
  await refreshAdresseAuswahl(kundeId, pickerEl, hinweisEl, meta, adresseFields);

  if (kundeJson?.objektId) {
    const obj = meta.objekteCache.find((o) => o.id === kundeJson.objektId);
    if (obj) {
      selectAdresseOption(meta, obj.id, adresseFields, hinweisEl);
      syncAdresseAuswahlActive(pickerEl, meta);
      return;
    }
  }

  if (kundeJson?.objekt?.name) {
    meta.selectedObjektId = kundeJson.objektId || null;
    meta.selectedAdresseKey = kundeJson.objektId || null;
    meta.objekt = {
      typ: 'einsatz',
      name: kundeJson.objekt.name || '',
      ...normalizeAdresse(kundeJson.objekt),
    };
    setAdresseFieldPair(adresseFields.strasseEl, adresseFields.plzOrtEl, kundeJson);
    updateEinsatzortHinweis(hinweisEl, meta);
    syncAdresseAuswahlActive(pickerEl, meta);
    return;
  }

  const saved = normalizeAdresse(kundeJson);
  if (meta.billingSnapshot && addressesEqual(saved, meta.billingSnapshot)) {
    selectAdresseOption(meta, 'billing', adresseFields, hinweisEl);
  } else {
    const altRechnung = meta.objekteCache.find(
      (o) => o.typ === 'rechnung' && addressesEqual(saved, o)
    );
    if (altRechnung) {
      selectAdresseOption(meta, altRechnung.id, adresseFields, hinweisEl);
    } else {
      meta.selectedAdresseKey = null;
      meta.selectedObjektId = null;
      meta.objekt = null;
      updateEinsatzortHinweis(hinweisEl, meta);
    }
  }

  syncAdresseAuswahlActive(pickerEl, meta);
}

function markAdresseManuallyEdited(meta, pickerEl, hinweisEl) {
  meta.selectedAdresseKey = null;
  meta.selectedObjektId = null;
  meta.objekt = null;
  syncAdresseAuswahlActive(pickerEl, meta);
  updateEinsatzortHinweis(hinweisEl, meta);
}

function handleAdresseAuswahlClick(meta, adresseFields, pickerEl, hinweisEl, event) {
  const btn = event.target.closest('[data-adresse-key]');
  if (!btn || !pickerEl?.contains(btn)) return;
  selectAdresseOption(meta, btn.dataset.adresseKey, adresseFields, hinweisEl);
  syncAdresseAuswahlActive(pickerEl, meta);
}

function buildKundePayload(name, adresseData, meta) {
  const addr = normalizeAdresse(adresseData);
  const kunde = {
    name,
    strasse: addr.strasse,
    plzOrt: addr.plzOrt,
    adresse: addr.adresse,
  };
  if (meta.selectedObjektId) {
    kunde.objektId = meta.selectedObjektId;
  }
  if (meta.objekt?.typ === 'einsatz') {
    const objAddr = normalizeAdresse(meta.objekt);
    kunde.objekt = {
      name: meta.objekt.name,
      strasse: objAddr.strasse,
      plzOrt: objAddr.plzOrt,
      adresse: objAddr.adresse,
    };
  }
  return kunde;
}

function resetKundenObjektForm() {
  state.editingObjektId = null;
  els.kundenObjektForm?.reset();
  els.kundenObjektTyp.value = 'einsatz';
  els.kundenObjektCancel?.classList.add('hidden');
}

function renderKundenObjekteHtml(objekte) {
  if (!objekte.length) {
    return '<p class="empty">Noch keine Objekte. Baustellen oder alternative Adressen unten anlegen.</p>';
  }

  return objekte
    .map(
      (o) => `
      <article class="kunden-objekt-item" data-id="${o.id}">
        <div class="kunden-objekt-item__main">
          <span class="kunden-objekt-item__badge kunden-objekt-item__badge--${o.typ}">${OBJEKT_TYP_LABELS[o.typ] || o.typ}</span>
          <h4>${escapeHtml(o.name)}</h4>
          ${o.adresse || o.strasse || o.plzOrt ? `<p>${formatAdresseHtml(o)}</p>` : ''}
        </div>
        <div class="kunden-objekt-item__actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="edit-objekt" data-id="${o.id}">Bearbeiten</button>
          <button type="button" class="btn btn-danger btn-sm" data-action="delete-objekt" data-id="${o.id}">Löschen</button>
        </div>
      </article>`
    )
    .join('');
}

async function renderKundenObjekteSection(kundeId) {
  if (!els.kundenDetailObjekteListe || !kundeId) return;
  els.kundenDetailObjekteListe.innerHTML = '<p class="empty">Lade Objekte…</p>';
  try {
    const objekte = await listKundenObjekte(kundeId);
    els.kundenDetailObjekteListe.innerHTML = renderKundenObjekteHtml(objekte);
  } catch (err) {
    els.kundenDetailObjekteListe.innerHTML = `<p class="empty">Fehler: ${escapeHtml(err.message)}</p>`;
  }
}

async function resolveKundeIdForSave(name, adresseData, selectedKundeId) {
  const trimmedName = (name || '').trim();
  const addr = normalizeAdresse(adresseData);

  if (!trimmedName) {
    return {
      kundeId: null,
      kunde: { name: '', strasse: addr.strasse, plzOrt: addr.plzOrt, adresse: addr.adresse },
    };
  }

  const jetzt = new Date().toISOString();
  const kunden = await getAllKunden();
  const kundeSnapshot = {
    name: trimmedName,
    strasse: addr.strasse,
    plzOrt: addr.plzOrt,
    adresse: addr.adresse,
  };

  const syncKunde = async (kunde, updates) => {
    const next = {
      ...kunde,
      ...updates,
      ...normalizeAdresse({ ...kunde, ...updates }),
      aktualisiertAm: jetzt,
    };
    const prev = normalizeAdresse(kunde);
    const changed =
      next.name !== kunde.name ||
      prev.strasse !== next.strasse ||
      prev.plzOrt !== next.plzOrt;
    if (changed) await saveKunde(next);
    return next;
  };

  if (selectedKundeId) {
    const selectedKunde = kunden.find((k) => k.id === selectedKundeId);
    if (selectedKunde) {
      const updated = await syncKunde(selectedKunde, {
        name: trimmedName,
        strasse: addr.strasse || normalizeAdresse(selectedKunde).strasse,
        plzOrt: addr.plzOrt || normalizeAdresse(selectedKunde).plzOrt,
      });
      const normalized = normalizeAdresse(updated);
      return {
        kundeId: selectedKunde.id,
        kunde: {
          name: updated.name,
          strasse: normalized.strasse,
          plzOrt: normalized.plzOrt,
          adresse: normalized.adresse,
        },
      };
    }
  }

  const byName = kunden.find((k) => normalizeKundeName(k.name) === normalizeKundeName(trimmedName));
  if (byName) {
    const prev = normalizeAdresse(byName);
    const updated = await syncKunde(byName, {
      strasse: addr.strasse || prev.strasse,
      plzOrt: addr.plzOrt || prev.plzOrt,
    });
    const normalized = normalizeAdresse(updated);
    return {
      kundeId: byName.id,
      kunde: {
        name: updated.name,
        strasse: normalized.strasse,
        plzOrt: normalized.plzOrt,
        adresse: normalized.adresse,
      },
    };
  }

  const neu = {
    id: createKundeId(),
    name: trimmedName,
    strasse: addr.strasse,
    plzOrt: addr.plzOrt,
    adresse: addr.adresse,
    erstelltAm: jetzt,
    aktualisiertAm: jetzt,
  };
  await saveKunde(neu);
  return { kundeId: neu.id, kunde: kundeSnapshot };
}

function dokumenteFuerKunde(kundeId, kundeName, angebote, rechnungen) {
  const norm = normalizeKundeName(kundeName);
  const matchKunde = (doc) => {
    if (kundeId && doc.kundeId === kundeId) return true;
    if (!doc.kundeId && norm) {
      return normalizeKundeName(doc.kunde?.name) === norm;
    }
    return false;
  };
  return {
    angebote: angebote.filter(matchKunde),
    rechnungen: rechnungen.filter(matchKunde),
  };
}

function renderKundenAngeboteListHtml(angebote) {
  if (angebote.length === 0) {
    return '<p class="empty empty--inline">Keine Angebote für diesen Kunden.</p>';
  }

  const sorted = [...angebote].sort(
    (a, b) =>
      new Date(b.aktualisiertAm || b.erstelltAm) - new Date(a.aktualisiertAm || a.erstelltAm)
  );

  const rows = sorted
    .map((a) => {
      const posten = resolvePostenDetails(a.posten);
      const { brutto } = berechneSummenAusPosten(posten);
      const datum = formatDatum(new Date(a.aktualisiertAm || a.erstelltAm));
      return `
      <li class="kunden-dokumente__row">
        <div class="kunden-dokumente__info">
          <span class="kunden-dokumente__nr">${escapeHtml(a.angebotNr)}</span>
          <span class="kunden-dokumente__meta">${escapeHtml(datum)} · ${formatEuro(brutto)} · ${posten.length} Posten</span>
        </div>
        <span class="kunden-dokumente__actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="kunde-angebot-rechnung" data-id="${a.id}">Rechnung erstellen</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="kunde-angebot-pdf" data-id="${a.id}">PDF</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="kunde-angebot-edit" data-id="${a.id}">Öffnen</button>
        </span>
      </li>`;
    })
    .join('');

  return `<ul class="kunden-dokumente__list">${rows}</ul>`;
}

function formatRechnungenCount(count) {
  if (count === 0) return 'Keine Rechnungen';
  if (count === 1) return '1 Rechnung';
  return `${count} Rechnungen`;
}

function renderKundenRechnungenListHtml(rechnungen) {
  if (rechnungen.length === 0) {
    return '<p class="empty empty--inline">Keine Rechnungen für diesen Kunden.</p>';
  }

  const sorted = [...rechnungen].sort(
    (a, b) =>
      new Date(b.aktualisiertAm || b.erstelltAm) - new Date(a.aktualisiertAm || a.erstelltAm)
  );

  const rows = sorted
    .map((r) => {
      const posten = resolvePostenDetails(r.posten);
      const { brutto } = berechneSummenAusPosten(posten);
      const datum = formatDatum(new Date(r.aktualisiertAm || r.erstelltAm));
      const angebotHint = r.angebotNr ? ` · Bezug: ${escapeHtml(r.angebotNr)}` : '';
      return `
      <li class="kunden-dokumente__row">
        <div class="kunden-dokumente__info">
          <span class="kunden-dokumente__nr">${escapeHtml(r.rechnungNr)}</span>
          <span class="kunden-dokumente__meta">${escapeHtml(datum)} · ${formatEuro(brutto)} · ${posten.length} Posten${angebotHint}</span>
        </div>
        <span class="kunden-dokumente__actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="kunde-rechnung-pdf" data-id="${r.id}">PDF</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="kunde-rechnung-edit" data-id="${r.id}">Öffnen</button>
        </span>
      </li>`;
    })
    .join('');

  return `<ul class="kunden-dokumente__list">${rows}</ul>`;
}

function formatAngeboteCount(count) {
  if (count === 0) return 'Keine Angebote';
  if (count === 1) return '1 Angebot';
  return `${count} Angebote`;
}

function renderKundenDokumenteHtml(angebote, rechnungen) {
  if (angebote.length === 0 && rechnungen.length === 0) return '';

  const angRows = angebote
    .map(
      (a) => `
      <li class="kunden-dokumente__row">
        <span class="kunden-dokumente__nr">${a.angebotNr}</span>
        <span class="kunden-dokumente__actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="kunde-angebot-pdf" data-id="${a.id}">PDF</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="kunde-angebot-edit" data-id="${a.id}">Öffnen</button>
        </span>
      </li>`
    )
    .join('');

  const rechnRows = rechnungen
    .map(
      (r) => `
      <li class="kunden-dokumente__row">
        <span class="kunden-dokumente__nr">${r.rechnungNr}</span>
        <span class="kunden-dokumente__actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="kunde-rechnung-pdf" data-id="${r.id}">PDF</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="kunde-rechnung-edit" data-id="${r.id}">Öffnen</button>
        </span>
      </li>`
    )
    .join('');

  return `
    <div class="kunden-dokumente">
      ${
        angebote.length
          ? `<div class="kunden-dokumente__block">
        <p class="kunden-dokumente__heading">Angebote (${angebote.length})</p>
        <ul class="kunden-dokumente__list">${angRows}</ul>
      </div>`
          : ''
      }
      ${
        rechnungen.length
          ? `<div class="kunden-dokumente__block">
        <p class="kunden-dokumente__heading">Rechnungen (${rechnungen.length})</p>
        <ul class="kunden-dokumente__list">${rechnRows}</ul>
      </div>`
          : ''
      }
    </div>`;
}

async function getFormAngebot() {
  const jetzt = new Date().toISOString();
  const bestehend = state.angebot.editingId ? await getAngebot(state.angebot.editingId) : null;

  return {
    id: state.angebot.editingId || createAngebotId(),
    angebotNr: els.angebotNr.value.trim() || (await generiereAngebotsnummer()),
    erstelltAm: bestehend?.erstelltAm || jetzt,
    aktualisiertAm: jetzt,
    angebotsdatum: els.angebotDatum.value,
    gueltigBis: els.gueltigBis.value,
    kundeId: state.angebot.selectedKundeId,
    kunde: buildKundePayload(
      els.kundeName.value.trim(),
      readAdresseFieldPair(els.kundeStrasse, els.kundePlzOrt),
      state.angebot
    ),
    posten: angebotPostenEditor.getPostenForSave(),
  };
}

async function getFormRechnung() {
  const jetzt = new Date().toISOString();
  const bestehend = state.rechnung.editingId ? await getRechnung(state.rechnung.editingId) : null;

  return {
    id: state.rechnung.editingId || createRechnungId(),
    rechnungNr: els.rechnungNr.value.trim() || (await generiereRechnungsnummer()),
    erstelltAm: bestehend?.erstelltAm || jetzt,
    aktualisiertAm: jetzt,
    rechnungsdatum: els.rechnungDatum.value,
    faelligAm: els.rechnungFaellig.value,
    kundeId: state.rechnung.selectedKundeId,
    kunde: buildKundePayload(
      els.rechnungKundeName.value.trim(),
      readAdresseFieldPair(els.rechnungKundeStrasse, els.rechnungKundePlzOrt),
      state.rechnung
    ),
    posten: rechnungPostenEditor.getPostenForSave(),
    angebotId: state.rechnung.angebotId || undefined,
    angebotNr: state.rechnung.angebotNr || undefined,
  };
}

function updateKundeHinweis() {
  els.kundeHinweis.classList.toggle('hidden', !state.angebot.selectedKundeId);
}

function updateRechnungKundeHinweis() {
  els.rechnungKundeHinweis.classList.toggle('hidden', !state.rechnung.selectedKundeId);
}

function updateRechnungAngebotRef() {
  if (!els.rechnungAngebotRef) return;
  if (state.rechnung.angebotNr) {
    els.rechnungAngebotRef.textContent = `Übernommen aus Angebot ${state.rechnung.angebotNr}`;
    els.rechnungAngebotRef.classList.remove('hidden');
  } else {
    els.rechnungAngebotRef.textContent = '';
    els.rechnungAngebotRef.classList.add('hidden');
  }
}

async function setupAngebotKundeAdressen(kunde) {
  const addr = normalizeAdresse(kunde);
  state.angebot.selectedKundeId = kunde.id;
  setBillingSnapshot(state.angebot, addr);
  els.kundeName.value = kunde.name;
  setAdresseFieldPair(els.kundeStrasse, els.kundePlzOrt, addr);
  await refreshAdresseAuswahl(
    kunde.id,
    els.kundeAdresseAuswahl,
    els.kundeEinsatzortHinweis,
    state.angebot,
    angebotAdresseFields()
  );
  selectAdresseOption(state.angebot, 'billing', angebotAdresseFields(), els.kundeEinsatzortHinweis);
  syncAdresseAuswahlActive(els.kundeAdresseAuswahl, state.angebot);
}

async function setupRechnungKundeAdressen(kunde) {
  const addr = normalizeAdresse(kunde);
  state.rechnung.selectedKundeId = kunde.id;
  setBillingSnapshot(state.rechnung, addr);
  els.rechnungKundeName.value = kunde.name;
  setAdresseFieldPair(els.rechnungKundeStrasse, els.rechnungKundePlzOrt, addr);
  await refreshAdresseAuswahl(
    kunde.id,
    els.rechnungAdresseAuswahl,
    els.rechnungEinsatzortHinweis,
    state.rechnung,
    rechnungAdresseFields()
  );
  selectAdresseOption(state.rechnung, 'billing', rechnungAdresseFields(), els.rechnungEinsatzortHinweis);
  syncAdresseAuswahlActive(els.rechnungAdresseAuswahl, state.rechnung);
}

function applyPickerKunde(kunde) {
  if (state.kundenPickerFor === 'rechnung') {
    void setupRechnungKundeAdressen(kunde).then(() => {
      updateRechnungKundeHinweis();
      updateRechnungKopfSummary();
    });
  } else {
    void setupAngebotKundeAdressen(kunde).then(() => {
      updateKundeHinweis();
      updateAngebotKopfSummary();
    });
  }
  closeKundenModal();
}

async function startNeuesAngebotForKunde(kunde) {
  await resetForm();
  await setupAngebotKundeAdressen(kunde);
  updateKundeHinweis();
  updateAngebotKopfSummary();
  setBereich('angebote', 'neu');
}

async function startNeueRechnungForKunde(kunde) {
  await resetRechnungForm();
  await setupRechnungKundeAdressen(kunde);
  updateRechnungKundeHinweis();
  updateRechnungKopfSummary();
  setBereich('rechnungen', 'rechnung-neu');
}

function clearKundeAuswahl() {
  state.angebot.selectedKundeId = null;
  clearObjektMeta(state.angebot);
  void refreshAdresseAuswahl(
    null,
    els.kundeAdresseAuswahl,
    els.kundeEinsatzortHinweis,
    state.angebot,
    angebotAdresseFields()
  );
  updateKundeHinweis();
}

function clearRechnungKundeAuswahl() {
  state.rechnung.selectedKundeId = null;
  clearObjektMeta(state.rechnung);
  void refreshAdresseAuswahl(
    null,
    els.rechnungAdresseAuswahl,
    els.rechnungEinsatzortHinweis,
    state.rechnung,
    rechnungAdresseFields()
  );
  updateRechnungKundeHinweis();
  updateRechnungKopfSummary();
}

async function resetForm() {
  state.angebot.editingId = null;
  setAngebotKopfCollapsed(isMobileLayout());
  angebotPostenEditor.clearPostenState();
  clearKundeAuswahl();
  els.kundeName.value = '';
  clearAdresseFieldPair(els.kundeStrasse, els.kundePlzOrt);
  els.angebotNr.value = await generiereAngebotsnummer();

  const heute = new Date();
  els.angebotDatum.value = heute.toISOString().split('T')[0];
  const gueltig = new Date(heute);
  gueltig.setDate(gueltig.getDate() + 30);
  els.gueltigBis.value = gueltig.toISOString().split('T')[0];

  updatePageHeader();
  angebotPostenEditor.render();
}

async function resetRechnungForm() {
  state.rechnung = createRechnungMeta();
  setRechnungKopfCollapsed(isMobileLayout());
  rechnungPostenEditor.clearPostenState();
  els.rechnungKundeName.value = '';
  clearAdresseFieldPair(els.rechnungKundeStrasse, els.rechnungKundePlzOrt);
  await refreshAdresseAuswahl(
    null,
    els.rechnungAdresseAuswahl,
    els.rechnungEinsatzortHinweis,
    state.rechnung,
    rechnungAdresseFields()
  );
  els.rechnungNr.value = await generiereRechnungsnummer();

  const heute = new Date();
  els.rechnungDatum.value = heute.toISOString().split('T')[0];
  els.rechnungFaellig.value = addDaysIso(heute, getZahlungszielTage());

  updateRechnungKundeHinweis();
  updateRechnungAngebotRef();
  updateRechnungPageHeader();
  updateRechnungKopfSummary();
  updateRechnungPostenKopfSummary();
  rechnungPostenEditor.render();
}

async function loadAngebotIntoForm(angebot) {
  state.angebot.editingId = angebot.id;
  setAngebotKopfCollapsed(isMobileLayout());
  state.angebot.selectedKundeId = angebot.kundeId || null;
  setBillingSnapshot(state.angebot, angebot.kunde);
  angebotPostenEditor.loadPostenFromDocument(angebot.posten);

  els.kundeName.value = angebot.kunde.name;
  setAdresseFieldPair(els.kundeStrasse, els.kundePlzOrt, angebot.kunde);
  els.angebotNr.value = angebot.angebotNr;
  els.angebotDatum.value =
    angebot.angebotsdatum || angebot.erstelltAm?.split('T')[0] || '';
  els.gueltigBis.value = angebot.gueltigBis;
  if (angebot.kundeId) {
    const stamm = await getKunde(angebot.kundeId);
    if (stamm) setBillingSnapshot(state.angebot, stamm);
    await restoreAdresseFromDocument(
      angebot.kundeId,
      angebot.kunde,
      els.kundeAdresseAuswahl,
      els.kundeEinsatzortHinweis,
      state.angebot,
      angebotAdresseFields()
    );
  } else {
    await refreshAdresseAuswahl(
      null,
      els.kundeAdresseAuswahl,
      els.kundeEinsatzortHinweis,
      state.angebot,
      angebotAdresseFields()
    );
  }
  updateKundeHinweis();

  setBereich('angebote', 'neu');
  updatePageHeader();
  angebotPostenEditor.render();
}

async function loadRechnungIntoForm(rechnung) {
  state.rechnung.editingId = rechnung.id;
  setRechnungKopfCollapsed(isMobileLayout());
  state.rechnung.selectedKundeId = rechnung.kundeId || null;
  setBillingSnapshot(state.rechnung, rechnung.kunde);
  state.rechnung.angebotId = rechnung.angebotId || null;
  state.rechnung.angebotNr = rechnung.angebotNr || null;
  rechnungPostenEditor.loadPostenFromDocument(rechnung.posten);

  els.rechnungKundeName.value = rechnung.kunde.name;
  setAdresseFieldPair(els.rechnungKundeStrasse, els.rechnungKundePlzOrt, rechnung.kunde);
  els.rechnungNr.value = rechnung.rechnungNr;
  els.rechnungDatum.value = rechnung.rechnungsdatum || rechnung.erstelltAm?.split('T')[0] || '';
  els.rechnungFaellig.value = rechnung.faelligAm || '';
  if (rechnung.kundeId) {
    const stamm = await getKunde(rechnung.kundeId);
    if (stamm) setBillingSnapshot(state.rechnung, stamm);
    await restoreAdresseFromDocument(
      rechnung.kundeId,
      rechnung.kunde,
      els.rechnungAdresseAuswahl,
      els.rechnungEinsatzortHinweis,
      state.rechnung,
      rechnungAdresseFields()
    );
  } else {
    await refreshAdresseAuswahl(
      null,
      els.rechnungAdresseAuswahl,
      els.rechnungEinsatzortHinweis,
      state.rechnung,
      rechnungAdresseFields()
    );
  }
  updateRechnungKundeHinweis();
  updateRechnungAngebotRef();

  setBereich('rechnungen', 'rechnung-neu');
  updateRechnungPageHeader();
  updateRechnungKopfSummary();
  updateRechnungPostenKopfSummary();
  rechnungPostenEditor.render();
}

async function loadAngebotAsRechnungEntwurf(angebot) {
  setBereich('rechnungen', 'rechnung-neu');
  state.rechnung = createRechnungMeta();
  setRechnungKopfCollapsed(isMobileLayout());
  state.rechnung.angebotId = angebot.id;
  state.rechnung.angebotNr = angebot.angebotNr;
  state.rechnung.selectedKundeId = angebot.kundeId || null;
  setBillingSnapshot(state.rechnung, angebot.kunde);
  rechnungPostenEditor.loadPostenFromDocument(angebot.posten);

  els.rechnungKundeName.value = angebot.kunde.name;
  setAdresseFieldPair(els.rechnungKundeStrasse, els.rechnungKundePlzOrt, angebot.kunde);
  if (angebot.kundeId) {
    const stamm = await getKunde(angebot.kundeId);
    if (stamm) setBillingSnapshot(state.rechnung, stamm);
    await restoreAdresseFromDocument(
      angebot.kundeId,
      angebot.kunde,
      els.rechnungAdresseAuswahl,
      els.rechnungEinsatzortHinweis,
      state.rechnung,
      rechnungAdresseFields()
    );
  } else {
    await refreshAdresseAuswahl(
      null,
      els.rechnungAdresseAuswahl,
      els.rechnungEinsatzortHinweis,
      state.rechnung,
      rechnungAdresseFields()
    );
  }
  els.rechnungNr.value = await generiereRechnungsnummer();

  const heute = new Date();
  els.rechnungDatum.value = heute.toISOString().split('T')[0];
  els.rechnungFaellig.value = addDaysIso(heute, getZahlungszielTage());

  updateRechnungKundeHinweis();
  updateRechnungAngebotRef();
  updateRechnungPageHeader();
  updateRechnungKopfSummary();
  updateRechnungPostenKopfSummary();
  rechnungPostenEditor.render();
}

function updatePageHeader() {
  if (state.angebot.editingId) {
    els.pdfBtn.textContent = 'PDF aktualisieren';
    els.resetBtn.classList.remove('hidden');
  } else {
    els.pdfBtn.textContent = 'PDF erstellen';
    els.resetBtn.classList.add('hidden');
  }
  updateAngebotKopfSummary();
}

function isAngebotKopfComplete() {
  return !!(
    els.angebotNr?.value.trim() &&
    els.angebotDatum?.value &&
    els.gueltigBis?.value &&
    els.kundeName?.value.trim() &&
    els.kundeStrasse?.value.trim() &&
    els.kundePlzOrt?.value.trim()
  );
}

function isRechnungKopfComplete() {
  return !!(
    els.rechnungNr?.value.trim() &&
    els.rechnungDatum?.value &&
    els.rechnungFaellig?.value &&
    els.rechnungKundeName?.value.trim() &&
    els.rechnungKundeStrasse?.value.trim() &&
    els.rechnungKundePlzOrt?.value.trim()
  );
}

function bindFormPdfValidation() {
  const refreshAngebotPdf = () => angebotPostenEditor.refreshSummary();
  const refreshRechnungPdf = () => rechnungPostenEditor.refreshSummary();

  [
    els.angebotNr,
    els.angebotDatum,
    els.gueltigBis,
    els.kundeName,
    els.kundeStrasse,
    els.kundePlzOrt,
  ].forEach((el) => {
    el?.addEventListener('input', refreshAngebotPdf);
    el?.addEventListener('change', refreshAngebotPdf);
  });

  [
    els.rechnungNr,
    els.rechnungDatum,
    els.rechnungFaellig,
    els.rechnungKundeName,
    els.rechnungKundeStrasse,
    els.rechnungKundePlzOrt,
  ].forEach((el) => {
    el?.addEventListener('input', refreshRechnungPdf);
    el?.addEventListener('change', refreshRechnungPdf);
  });
}

function updateAngebotKopfSummary() {
  const name = els.kundeName?.value.trim() || '';
  const strasse = els.kundeStrasse?.value.trim() || '';
  const plzOrt = els.kundePlzOrt?.value.trim() || '';
  const parts = [name, strasse, plzOrt].filter(Boolean);
  const hasKundeData = parts.length > 0;
  const summary = hasKundeData ? parts.join(' – ') : DOC_KOPF_LABEL;
  if (els.angebotKopfSummaryKunde) els.angebotKopfSummaryKunde.textContent = summary;
  els.angebotKopfSummaryMeta?.classList.toggle('is-empty', !hasKundeData);
}

function updateRechnungKopfSummary() {
  const name = els.rechnungKundeName?.value.trim() || '';
  const strasse = els.rechnungKundeStrasse?.value.trim() || '';
  const plzOrt = els.rechnungKundePlzOrt?.value.trim() || '';
  const parts = [name, strasse, plzOrt].filter(Boolean);
  const hasKundeData = parts.length > 0;
  const summary = hasKundeData ? parts.join(' – ') : DOC_KOPF_LABEL;
  if (els.rechnungKopfSummaryKunde) els.rechnungKopfSummaryKunde.textContent = summary;
  els.rechnungKopfSummaryMeta?.classList.toggle('is-empty', !hasKundeData);
}

function isMobileLayout() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function setAngebotKopfCollapsed(collapsed) {
  els.angebotKopf?.classList.toggle('is-collapsed', collapsed);
  els.angebotKopfToggle?.setAttribute('aria-expanded', String(!collapsed));
}

function updatePostenKopfSummary() {
  const count = angebotPostenEditor.getAusgewaehltePosten().length;
  if (!els.postenKopfSummaryCount) return;
  if (count === 0) els.postenKopfSummaryCount.textContent = 'Keine Posten';
  else if (count === 1) els.postenKopfSummaryCount.textContent = '1 Posten';
  else els.postenKopfSummaryCount.textContent = `${count} Posten`;
}

function setPostenKopfCollapsed(collapsed) {
  els.postenKopf?.classList.toggle('is-collapsed', collapsed);
  els.postenKopfToggle?.setAttribute('aria-expanded', String(!collapsed));
}

function setRechnungKopfCollapsed(collapsed) {
  els.rechnungKopf?.classList.toggle('is-collapsed', collapsed);
  els.rechnungKopfToggle?.setAttribute('aria-expanded', String(!collapsed));
}

function updateRechnungPostenKopfSummary() {
  const count = rechnungPostenEditor.getAusgewaehltePosten().length;
  if (!els.rechnungPostenKopfSummaryCount) return;
  if (count === 0) els.rechnungPostenKopfSummaryCount.textContent = 'Keine Posten';
  else if (count === 1) els.rechnungPostenKopfSummaryCount.textContent = '1 Posten';
  else els.rechnungPostenKopfSummaryCount.textContent = `${count} Posten`;
}

function setRechnungPostenKopfCollapsed(collapsed) {
  els.rechnungPostenKopf?.classList.toggle('is-collapsed', collapsed);
  els.rechnungPostenKopfToggle?.setAttribute('aria-expanded', String(!collapsed));
}

function collapseAngebotWhenEnteringPosten() {
  if (!isAngebotKopfComplete()) return;
  setAngebotKopfCollapsed(true);
  setPostenKopfCollapsed(false);
}

function collapseRechnungWhenEnteringPosten() {
  if (!isRechnungKopfComplete()) return;
  setRechnungKopfCollapsed(true);
  setRechnungPostenKopfCollapsed(false);
}

function bindAngebotKopfToggle() {
  if (!els.angebotKopfToggle) return;

  setAngebotKopfCollapsed(isMobileLayout());

  els.angebotKopfToggle.addEventListener('click', () => {
    const collapsed = !els.angebotKopf?.classList.contains('is-collapsed');
    setAngebotKopfCollapsed(collapsed);
  });

  els.kundeName?.addEventListener('input', updateAngebotKopfSummary);
  els.kundeStrasse?.addEventListener('input', updateAngebotKopfSummary);
  els.kundePlzOrt?.addEventListener('input', updateAngebotKopfSummary);
  updateAngebotKopfSummary();
}

function bindPostenKopfToggle() {
  if (!els.postenKopfToggle) return;

  setPostenKopfCollapsed(false);

  els.postenKopfToggle.addEventListener('click', () => {
    const collapsed = !els.postenKopf?.classList.contains('is-collapsed');
    setPostenKopfCollapsed(collapsed);
    if (!collapsed) collapseAngebotWhenEnteringPosten();
  });

  els.postenKopf?.addEventListener('focusin', (e) => {
    if (els.postenKopfToggle?.contains(e.target)) return;
    if (!els.postenKopfBody?.contains(e.target)) return;
    collapseAngebotWhenEnteringPosten();
  });

  els.postenKopf?.addEventListener('pointerdown', (e) => {
    if (els.postenKopfToggle?.contains(e.target)) return;
    if (!els.postenKopfBody?.contains(e.target)) return;
    collapseAngebotWhenEnteringPosten();
  });

  updatePostenKopfSummary();
}

function bindRechnungKopfToggle() {
  if (!els.rechnungKopfToggle) return;

  setRechnungKopfCollapsed(isMobileLayout());

  els.rechnungKopfToggle.addEventListener('click', () => {
    const collapsed = !els.rechnungKopf?.classList.contains('is-collapsed');
    setRechnungKopfCollapsed(collapsed);
  });

  els.rechnungKundeName?.addEventListener('input', updateRechnungKopfSummary);
  els.rechnungKundeStrasse?.addEventListener('input', updateRechnungKopfSummary);
  els.rechnungKundePlzOrt?.addEventListener('input', updateRechnungKopfSummary);
  updateRechnungKopfSummary();
}

function bindRechnungPostenKopfToggle() {
  if (!els.rechnungPostenKopfToggle) return;

  setRechnungPostenKopfCollapsed(false);

  els.rechnungPostenKopfToggle.addEventListener('click', () => {
    const collapsed = !els.rechnungPostenKopf?.classList.contains('is-collapsed');
    setRechnungPostenKopfCollapsed(collapsed);
    if (!collapsed) collapseRechnungWhenEnteringPosten();
  });

  els.rechnungPostenKopf?.addEventListener('focusin', (e) => {
    if (els.rechnungPostenKopfToggle?.contains(e.target)) return;
    if (!els.rechnungPostenKopfBody?.contains(e.target)) return;
    collapseRechnungWhenEnteringPosten();
  });

  els.rechnungPostenKopf?.addEventListener('pointerdown', (e) => {
    if (els.rechnungPostenKopfToggle?.contains(e.target)) return;
    if (!els.rechnungPostenKopfBody?.contains(e.target)) return;
    collapseRechnungWhenEnteringPosten();
  });

  updateRechnungPostenKopfSummary();
}

function updateRechnungPageHeader() {
  if (state.rechnung.editingId) {
    els.rechnungPdfBtn.textContent = 'PDF aktualisieren';
    els.rechnungResetBtn.classList.remove('hidden');
  } else {
    els.rechnungPdfBtn.textContent = 'PDF erstellen';
    els.rechnungResetBtn.classList.add('hidden');
  }
  updateRechnungKopfSummary();
}

function formatPlan(plan) {
  return formatPlanLabel(plan);
}

function updateRegisterPlanNote() {
  if (!els.registerPlanNote) return;
  els.registerPlanNote.textContent = `Gewählte Stufe: ${formatPlanLabel(pendingRegistrationPlan)}`;
}

function setProfilAccountStatus(message, isError = false) {
  if (!els.profilAccountStatus) return;
  if (!message) {
    els.profilAccountStatus.classList.add('hidden');
    els.profilAccountStatus.textContent = '';
    els.profilAccountStatus.classList.remove('settings-status--error');
    return;
  }
  els.profilAccountStatus.textContent = message;
  els.profilAccountStatus.classList.toggle('settings-status--error', isError);
  els.profilAccountStatus.classList.remove('hidden');
}

function setProfilPasswordStatus(message, isError = false) {
  if (!els.profilPasswordStatus) return;
  if (!message) {
    els.profilPasswordStatus.classList.add('hidden');
    els.profilPasswordStatus.textContent = '';
    els.profilPasswordStatus.classList.remove('settings-status--error');
    return;
  }
  els.profilPasswordStatus.textContent = message;
  els.profilPasswordStatus.classList.toggle('settings-status--error', isError);
  els.profilPasswordStatus.classList.remove('hidden');
}

function setProfilNummernStatus(message, isError = false) {
  if (!els.profilNummernStatus) return;
  if (!message) {
    els.profilNummernStatus.classList.add('hidden');
    els.profilNummernStatus.textContent = '';
    els.profilNummernStatus.classList.remove('settings-status--error');
    return;
  }
  els.profilNummernStatus.textContent = message;
  els.profilNummernStatus.classList.toggle('settings-status--error', isError);
  els.profilNummernStatus.classList.remove('hidden');
}

function updateProfilSchemaPreviews() {
  const updateOne = (input, preview, previewFn) => {
    if (!input || !preview) return;
    const schema = String(input.value || '').trim();
    if (!schema) {
      preview.textContent = '—';
      return;
    }
    try {
      preview.textContent = previewFn(schema, new Date(), 1);
    } catch {
      preview.textContent = 'Ungültiges Schema';
    }
  };

  updateOne(els.profilAngebotNummerSchema, els.profilAngebotSchemaPreview, previewAngebotsnummer);
  updateOne(
    els.profilRechnungNummerSchema,
    els.profilRechnungSchemaPreview,
    previewRechnungsnummer
  );
}

async function renderProfilView() {
  await refreshSession();
  const session = getSession();
  const tenant = session?.tenant;
  const user = session?.user;

  if (els.profilTenantName) els.profilTenantName.value = tenant?.name || '';
  if (els.profilEmail) els.profilEmail.textContent = user?.email || '—';
  if (els.profilPlan) els.profilPlan.textContent = formatPlan(tenant?.plan);

  setProfilAccountStatus('');
  setProfilPasswordStatus('');
  setProfilNummernStatus('');
  els.profilPasswordForm?.reset();

  await loadPdfTemplate();
  const tpl = getPdfTemplate();
  if (els.profilAngebotNummerSchema) {
    els.profilAngebotNummerSchema.value =
      tpl.angebot?.nummerSchema || 'ANG-{YYYY}{MM}{DD}-{NR:3}';
  }
  if (els.profilRechnungNummerSchema) {
    els.profilRechnungNummerSchema.value =
      tpl.rechnung?.nummerSchema || 'RE-{YYYY}{MM}{DD}-{NR:3}';
  }
  updateProfilSchemaPreviews();
  syncProfilNummernAccess();
  syncProfilPlanAccess();
}

function syncProfilPlanAccess() {
  const plan = getSession()?.tenant?.plan;
  const hideChange = plan === 'admin';
  els.profilPlanChangeBtn?.classList.toggle('hidden', hideChange);
}

function setProfilPlanModalStatus(message, isError = false) {
  if (!els.profilPlanModalStatus) return;
  if (!message) {
    els.profilPlanModalStatus.classList.add('hidden');
    els.profilPlanModalStatus.textContent = '';
    els.profilPlanModalStatus.classList.remove('settings-status--error');
    return;
  }
  els.profilPlanModalStatus.textContent = message;
  els.profilPlanModalStatus.classList.toggle('settings-status--error', isError);
  els.profilPlanModalStatus.classList.remove('hidden');
}

function renderProfilPlanModalList() {
  if (!els.profilPlanModalList) return;

  const currentPlan = normalizeRegistrationPlan(getSession()?.tenant?.plan);
  els.profilPlanModalList.innerHTML = REGISTRATION_PLANS.map((planId) => {
    const isCurrent = planId === currentPlan;
    const actionLabel = isCurrent ? 'Aktueller Tarif' : 'Wechseln';
    const actionClass = isCurrent ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm';
    return `
      <article
        class="profil-plan-option${isCurrent ? ' profil-plan-option--current' : ''}"
        role="listitem"
        data-plan-id="${escapeHtml(planId)}"
      >
        <div class="profil-plan-option__main">
          <h3 class="profil-plan-option__name">${escapeHtml(PLAN_LABELS[planId] || planId)}</h3>
          <p class="profil-plan-option__meta">
            ${escapeHtml(PLAN_PRICES[planId] || '')}${PLAN_TAGLINES[planId] ? ` · ${escapeHtml(PLAN_TAGLINES[planId])}` : ''}
          </p>
        </div>
        <div class="profil-plan-option__action">
          <button
            type="button"
            class="${actionClass}"
            data-profil-plan-select="${escapeHtml(planId)}"
            ${isCurrent ? 'disabled aria-current="true"' : 'disabled title="Tarifwechsel demnächst verfügbar"'}
          >
            ${actionLabel}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

function openProfilPlanModal() {
  if (!els.profilPlanModal) return;
  renderProfilPlanModalList();
  setProfilPlanModalStatus('');
  els.profilPlanModal.classList.remove('hidden');
  els.profilPlanModal.setAttribute('aria-hidden', 'false');
  els.profilPlanModal.querySelector('[data-close-profil-plan-modal].btn')?.focus();
}

function closeProfilPlanModal() {
  if (!els.profilPlanModal) return;
  els.profilPlanModal.classList.add('hidden');
  els.profilPlanModal.setAttribute('aria-hidden', 'true');
  setProfilPlanModalStatus('');
}

function syncProfilNummernAccess() {
  const admin = isAdmin();
  const canEditSchemas = admin;

  [els.profilAngebotNummerSchema, els.profilRechnungNummerSchema].forEach((input) => {
    if (!input) return;
    input.readOnly = !canEditSchemas;
    input.tabIndex = canEditSchemas ? 0 : -1;
    input.setAttribute('aria-readonly', canEditSchemas ? 'false' : 'true');
    input.classList.toggle('pdf-schema-input', !canEditSchemas);
  });

  els.profilNummernActions?.classList.toggle('hidden', !canEditSchemas);
  els.profilDeleteAccountBtn?.classList.toggle(
    'hidden',
    getSession()?.tenant?.plan === 'admin'
  );
}

function setProfilDeleteStatus(message, isError = false) {
  if (!els.profilDeleteStatus) return;
  if (!message) {
    els.profilDeleteStatus.classList.add('hidden');
    els.profilDeleteStatus.textContent = '';
    els.profilDeleteStatus.classList.remove('settings-status--error');
    return;
  }
  els.profilDeleteStatus.textContent = message;
  els.profilDeleteStatus.classList.toggle('settings-status--error', isError);
  els.profilDeleteStatus.classList.remove('hidden');
}

function openProfilDeleteModal() {
  if (!els.profilDeleteModal) return;
  els.profilDeleteModal.classList.remove('hidden');
  els.profilDeleteModal.setAttribute('aria-hidden', 'false');
  setProfilDeleteStatus('');
  if (els.profilDeletePlz) {
    els.profilDeletePlz.value = '';
    els.profilDeletePlz.focus();
  }
}

function closeProfilDeleteModal() {
  if (!els.profilDeleteModal) return;
  els.profilDeleteModal.classList.add('hidden');
  els.profilDeleteModal.setAttribute('aria-hidden', 'true');
  setProfilDeleteStatus('');
  if (els.profilDeletePlz) els.profilDeletePlz.value = '';
}

function formatAdminDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatUserRole(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'owner') return 'Inhaber';
  return role || '—';
}

async function renderAdminView() {
  if (!els.adminUserList) return;
  if (!isAdmin()) {
    els.adminUserList.innerHTML = '<p class="empty">Keine Berechtigung.</p>';
    return;
  }

  els.adminUserList.innerHTML = '<p class="empty">Lade Nutzer…</p>';

  try {
    const data = await loadAdminUsers();
    const users = data?.users || [];

    if (users.length === 0) {
      els.adminUserList.innerHTML = '<p class="empty">Noch keine registrierten Nutzer.</p>';
      return;
    }

    els.adminUserList.innerHTML = `
      <p class="admin-user-list__summary">${users.length} Nutzer registriert</p>
      <div class="admin-user-table-wrap">
        <table class="admin-user-table">
          <thead>
            <tr>
              <th scope="col">E-Mail</th>
              <th scope="col">Firma</th>
              <th scope="col">Rolle</th>
              <th scope="col">Tarif</th>
              <th scope="col">Registriert</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map(
                (user) => `
              <tr>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.tenant?.name || '—')}</td>
                <td><span class="admin-user-role admin-user-role--${escapeHtml(user.role || 'owner')}">${escapeHtml(formatUserRole(user.role))}</span></td>
                <td>${escapeHtml(user.tenant?.plan || '—')}</td>
                <td>${escapeHtml(formatAdminDate(user.createdAt))}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    els.adminUserList.innerHTML = `<p class="empty">Fehler beim Laden: ${escapeHtml(err.message)}</p>`;
  }
}

function syncProfileButton(view = state.view) {
  if (!els.profileBtn) return;
  const tenant = getCurrentTenant();
  const user = getCurrentUser();
  const labelParts = [user, tenant?.name].filter(Boolean);
  const label = labelParts.length ? `Profil (${labelParts.join(' · ')})` : 'Profil';
  els.profileBtn.setAttribute('aria-label', label);
  els.profileBtn.title = label;
  els.profileBtn.classList.toggle('is-current', view === 'profil');
}

function syncAdminNav() {
  document.querySelectorAll('.is-admin-only').forEach((el) => {
    el.classList.toggle('hidden', !isAdmin());
  });
}

const NAV_VIEW_GROUPS = {
  neu: 'angebote',
  archiv: 'angebote',
  'rechnung-neu': 'rechnungen',
  'rechnung-archiv': 'rechnungen',
  kunden: 'kunden',
  katalog: 'katalog',
  'pdf-vorlage': 'pdf-vorlage',
  'pdf-vorlage-angebot': 'pdf-vorlage',
  'pdf-vorlage-rechnung': 'pdf-vorlage',
  admin: 'admin',
};

function closeNavMenus() {
  document.querySelectorAll('.app-nav__group.is-open').forEach((group) => {
    group.classList.remove('is-open');
    const trigger = group.querySelector('[data-nav-trigger]');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

function closeMobileNav() {
  if (!els.mainNav || !els.navMobileToggle) return;
  els.mainNav.classList.remove('is-mobile-open');
  els.navMobileToggle.setAttribute('aria-expanded', 'false');
  els.navMobileToggle.setAttribute('aria-label', 'Menü öffnen');
  closeNavMenus();
}

function resolveNavBarView(view) {
  const resolved = resolvePdfVorlageView(view);
  if (resolved === 'profil') {
    return state.lastNavBarView ?? (state.bereich === 'rechnungen' ? 'rechnung-neu' : 'neu');
  }
  if (
    resolved === 'neu' ||
    resolved === 'archiv' ||
    resolved === 'katalog' ||
    resolved === 'kunden' ||
    resolved === 'admin' ||
    resolved === 'rechnung-neu' ||
    resolved === 'rechnung-archiv' ||
    isPdfVorlageView(resolved)
  ) {
    return resolved;
  }
  return state.bereich === 'rechnungen' ? 'rechnung-neu' : 'neu';
}

let navIndicatorEl = null;
let navIndicatorReady = false;

function ensureNavIndicator() {
  const list = els.mainNav?.querySelector('.app-nav__list');
  if (!list || navIndicatorEl) return;
  navIndicatorEl = document.createElement('div');
  navIndicatorEl.className = 'app-nav__indicator';
  navIndicatorEl.setAttribute('aria-hidden', 'true');
  list.prepend(navIndicatorEl);
}

function syncNavIndicator(animate = true) {
  if (!window.matchMedia('(max-width: 920px)').matches) {
    navIndicatorEl?.classList.add('hidden');
    return;
  }

  ensureNavIndicator();
  const list = els.mainNav?.querySelector('.app-nav__list');
  if (!list || !navIndicatorEl) return;

  navIndicatorEl.classList.remove('hidden');
  list.classList.toggle('is-rechnungen', state.bereich === 'rechnungen');

  const current =
    list.querySelector('[data-nav-view].is-current') ||
    list.querySelector(`[data-nav-view="${state.bereich === 'rechnungen' ? 'rechnung-neu' : 'neu'}"]`);
  if (!current) return;

  const listRect = list.getBoundingClientRect();
  const tabRect = current.getBoundingClientRect();
  const x = tabRect.left - listRect.left;
  const w = tabRect.width;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldAnimate = animate && navIndicatorReady && !reduceMotion;

  if (!shouldAnimate) {
    navIndicatorEl.style.transition = 'none';
  }

  navIndicatorEl.style.width = `${w}px`;
  navIndicatorEl.style.transform = `translateX(${x}px)`;

  if (!shouldAnimate) {
    requestAnimationFrame(() => {
      if (navIndicatorEl) navIndicatorEl.style.transition = '';
      navIndicatorReady = true;
    });
  }
}

function syncNavState(view) {
  const resolved = resolvePdfVorlageView(view);
  const navView = resolveNavBarView(view);

  if (resolved !== 'profil') {
    state.lastNavBarView = navView;
  }

  document.querySelectorAll('[data-nav-view]').forEach((el) => {
    const navItemView = el.dataset.navView;
    const isCurrent =
      navItemView === navView || (navItemView === 'pdf-vorlage' && isPdfVorlageView(navView));
    el.classList.toggle('is-current', isCurrent);
  });

  document.querySelectorAll('[data-nav-group]').forEach((group) => {
    const groupId = group.dataset.navGroup;
    group.classList.toggle('is-active', NAV_VIEW_GROUPS[navView] === groupId);
  });

  syncNavIndicator(true);

  if (window.matchMedia('(max-width: 920px)').matches) {
    requestAnimationFrame(() => {
      const current = document.querySelector('[data-nav-view].is-current');
      current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      syncNavIndicator(false);
    });
  }
}

function toggleNavGroup(group, forceOpen) {
  const isOpen = group.classList.contains('is-open');
  const shouldOpen = forceOpen ?? !isOpen;
  closeNavMenus();
  if (shouldOpen) {
    group.classList.add('is-open');
    const trigger = group.querySelector('[data-nav-trigger]');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }
}

function syncBereichNav() {
  const isRechnungen = state.bereich === 'rechnungen';
  document.querySelectorAll('[data-nav-group="angebote"]').forEach((group) => {
    group.classList.toggle('is-bereich-hidden', isRechnungen);
  });
  document.querySelectorAll('[data-nav-group="rechnungen"]').forEach((group) => {
    group.classList.toggle('is-bereich-hidden', !isRechnungen);
  });
  els.mainNav?.classList.remove('hidden');
}

function syncBereichSwitcher() {
  const { bereichSwitcherMark, bereichSwitcherLabel } = els;
  if (!bereichSwitcherMark || !bereichSwitcherLabel) return;

  if (state.bereich === 'rechnungen') {
    bereichSwitcherMark.textContent = 'R';
    bereichSwitcherMark.className = 'app-brand__mark app-brand__mark--rechnungen';
    bereichSwitcherLabel.textContent = 'Rechnungen';
  } else {
    bereichSwitcherMark.textContent = 'A';
    bereichSwitcherMark.className = 'app-brand__mark app-brand__mark--angebote';
    bereichSwitcherLabel.textContent = 'Angebote';
  }

  els.bereichSwitcherMenu?.querySelectorAll('[data-bereich]').forEach((btn) => {
    const alternate = state.bereich === 'rechnungen' ? 'angebote' : 'rechnungen';
    btn.hidden = btn.dataset.bereich !== alternate;
  });

  document.querySelectorAll('.app-bereich-segment__btn').forEach((btn) => {
    const active = btn.dataset.bereich === state.bereich;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });
}

function openBereichDropdown() {
  if (!els.bereichSwitcherMenu || !els.bereichSwitcherWrap) return;
  syncBereichSwitcher();
  closeNavMenus();
  els.bereichSwitcherMenu.classList.remove('hidden');
  els.bereichSwitcherWrap.classList.add('is-open');
  els.bereichSwitcher?.setAttribute('aria-expanded', 'true');
}

function closeBereichDropdown() {
  if (!els.bereichSwitcherMenu || !els.bereichSwitcherWrap) return;
  els.bereichSwitcherMenu.classList.add('hidden');
  els.bereichSwitcherWrap.classList.remove('is-open');
  els.bereichSwitcher?.setAttribute('aria-expanded', 'false');
}

function toggleBereichDropdown() {
  if (els.bereichSwitcherWrap?.classList.contains('is-open')) {
    closeBereichDropdown();
    return;
  }
  openBereichDropdown();
}

function setBereich(bereich, viewAfter) {
  closeBereichDropdown();
  state.bereich = bereich;
  saveBereich(bereich);
  state.expandedKundeDokumenteId = null;
  syncBereichSwitcher();
  syncBereichNav();

  if (bereich === 'rechnungen') {
    closeMobileNav();
    const nextView =
      viewAfter ?? (isPdfVorlageView(state.view) ? 'pdf-vorlage-rechnung' : 'rechnung-neu');
    showView(nextView);
    return;
  }

  els.viewRechnungNeu?.classList.add('hidden');
  els.viewRechnungArchiv?.classList.add('hidden');
  const nextView =
    viewAfter ?? (isPdfVorlageView(state.view) ? 'pdf-vorlage-angebot' : state.view);
  showView(nextView);
}

function bindBereichSwitch() {
  els.bereichSwitcher?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleBereichDropdown();
  });

  const activateBereich = (next) => {
    if (!next || next === state.bereich) return;
    closeBereichDropdown();
    closeMobileNav();
    if (next === 'angebote') {
      const viewAfter = isPdfVorlageView(state.view) ? 'pdf-vorlage-angebot' : 'neu';
      setBereich('angebote', viewAfter);
    } else {
      const viewAfter = isPdfVorlageView(state.view) ? 'pdf-vorlage-rechnung' : 'rechnung-neu';
      setBereich('rechnungen', viewAfter);
    }
  };

  els.bereichSwitcherMenu?.querySelectorAll('[data-bereich]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activateBereich(btn.dataset.bereich);
    });
  });

  document.querySelectorAll('.app-bereich-segment__btn').forEach((btn) => {
    btn.addEventListener('click', () => activateBereich(btn.dataset.bereich));
  });
}

function bindMainNav() {
  if (!els.mainNav) return;

  bindBereichSwitch();
  window.addEventListener('resize', () => syncNavIndicator(false));

  els.navMobileToggle?.addEventListener('click', () => {
    const open = els.mainNav.classList.toggle('is-mobile-open');
    els.navMobileToggle.setAttribute('aria-expanded', String(open));
    els.navMobileToggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    if (!open) closeNavMenus();
  });

  els.mainNav.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-nav-trigger]');
    if (trigger) {
      e.preventDefault();
      const mobileNav = window.matchMedia('(max-width: 920px)').matches;
      if (mobileNav) {
        toggleNavGroup(trigger.closest('.app-nav__group'));
      }
      return;
    }

    const link = e.target.closest('[data-nav-view]');
    const inMenu = link?.closest('.app-nav__menu');
    const directTrigger =
      link?.classList.contains('app-nav__trigger') && link.dataset.navView;
    if (link?.dataset.navView && (inMenu || directTrigger)) {
      if (link.dataset.navView === 'kunden' && !state.editingKundeId) {
        resetKundenForm();
      }
      showView(link.dataset.navView);
      closeMobileNav();
      closeNavMenus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.bereich-switcher')) {
      closeBereichDropdown();
    }
    if (!e.target.closest('.app-header')) {
      closeNavMenus();
      closeMobileNav();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeBereichDropdown();
      closeNavMenus();
      closeMobileNav();
    }
  });
}

function showView(view) {
  view = resolvePdfVorlageView(view);
  if (view === 'admin' && !isAdmin()) return;
  if (state.bereich === 'rechnungen') {
    state.view = view;
    els.viewNeu.classList.add('hidden');
    els.viewArchiv.classList.add('hidden');
    els.viewRechnungNeu.classList.toggle('hidden', view !== 'rechnung-neu');
    els.viewRechnungArchiv.classList.toggle('hidden', view !== 'rechnung-archiv');
    els.viewKunden.classList.toggle('hidden', view !== 'kunden');
    els.viewKatalog?.classList.toggle('hidden', view !== 'katalog');
    syncPdfVorlageViews(view);
    els.viewProfil?.classList.toggle('hidden', view !== 'profil');
    els.viewAdmin?.classList.toggle('hidden', view !== 'admin');
    els.angebotStickyFooter?.classList.add('hidden');
    els.rechnungStickyFooter?.classList.toggle('hidden', view !== 'rechnung-neu');
    syncNavState(view);
    syncProfileButton(view);

    if (view === 'rechnung-archiv') {
      renderRechnungArchiv();
    } else if (view === 'kunden') {
      renderKundenView();
    } else if (view === 'katalog') {
      renderKatalogView();
    } else if (view === 'admin') {
      renderAdminView();
    } else if (isPdfVorlageView(view)) {
      renderPdfTemplateView(view, { syncLayoutFromTemplate: true });
    } else if (view === 'profil') {
      renderProfilView();
    } else if (view === 'rechnung-neu') {
      updateRechnungPageHeader();
    }
    return;
  }

  state.view = view;
  els.viewRechnungNeu?.classList.add('hidden');
  els.viewRechnungArchiv?.classList.add('hidden');
  els.rechnungStickyFooter?.classList.add('hidden');
  els.viewNeu.classList.toggle('hidden', view !== 'neu');
  els.viewArchiv.classList.toggle('hidden', view !== 'archiv');
  els.viewKunden.classList.toggle('hidden', view !== 'kunden');
  els.viewKatalog?.classList.toggle('hidden', view !== 'katalog');
  syncPdfVorlageViews(view);
  els.viewProfil?.classList.toggle('hidden', view !== 'profil');
  els.viewAdmin?.classList.toggle('hidden', view !== 'admin');
  syncNavState(view);
  syncProfileButton(view);

  if (view === 'archiv') {
    els.angebotStickyFooter.classList.add('hidden');
    renderArchiv();
  } else if (view === 'kunden') {
    els.angebotStickyFooter.classList.add('hidden');
    renderKundenView();
  } else if (view === 'katalog') {
    els.angebotStickyFooter.classList.add('hidden');
    renderKatalogView();
  } else if (view === 'admin') {
    els.angebotStickyFooter.classList.add('hidden');
    renderAdminView();
  } else if (isPdfVorlageView(view)) {
    els.angebotStickyFooter.classList.add('hidden');
    renderPdfTemplateView(view, { syncLayoutFromTemplate: true });
  } else if (view === 'profil') {
    els.angebotStickyFooter.classList.add('hidden');
    renderProfilView();
  } else {
    els.angebotStickyFooter.classList.remove('hidden');
    updatePageHeader();
  }
}

function setPdfTemplateStatus(form, message, isError = false) {
  const status = form?.querySelector('.pdf-template-status');
  if (!status) return;
  if (!message) {
    status.classList.add('hidden');
    status.textContent = '';
    return;
  }
  status.textContent = message;
  status.classList.toggle('settings-status--error', isError);
  status.classList.remove('hidden');
}

function syncColorFieldValues(form, name, hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
  const colorInput = form.elements[name];
  const hexInput = form.querySelector(`[data-sync-color="${name}"]`);
  const rgbInput = form.querySelector(`[data-sync-color-rgb="${name}"]`);
  if (colorInput) colorInput.value = hex;
  if (hexInput) hexInput.value = hex;
  if (rgbInput) rgbInput.value = formatRgbFromHex(hex);
  return true;
}

function syncColorHexFields(form) {
  form.querySelectorAll('[data-sync-color]').forEach((hexInput) => {
    const name = hexInput.dataset.syncColor;
    const colorInput = form.elements[name];
    if (colorInput) syncColorFieldValues(form, name, colorInput.value);
  });
}

function bindColorFieldSync(form) {
  form.querySelectorAll('input[type="color"]').forEach((colorInput) => {
    colorInput.addEventListener('input', () => {
      syncColorFieldValues(form, colorInput.name, colorInput.value);
    });
  });
  form.querySelectorAll('[data-sync-color]').forEach((hexInput) => {
    hexInput.addEventListener('change', () => {
      const raw = hexInput.value.trim();
      const hex = raw.startsWith('#') ? raw : `#${raw}`;
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        syncColorFieldValues(form, hexInput.dataset.syncColor, hex);
      }
    });
  });
  form.querySelectorAll('[data-sync-color-rgb]').forEach((rgbInput) => {
    rgbInput.addEventListener('change', () => {
      const rgb = parseRgbInput(rgbInput.value);
      if (!rgb) return;
      const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
      syncColorFieldValues(form, rgbInput.dataset.syncColorRgb, hex);
    });
  });
}

const PDF_PREVIEW_SECTION_MAP = {
  briefkopf: ['briefkopf'],
  banner: ['briefkopf'],
  firma: ['briefkopf'],
  line: ['briefkopf'],
  meta: ['meta'],
  text: ['text'],
  table: ['table'],
  fuss: ['fuss'],
  kunde: [],
};

function resolvePdfPreviewSections(region) {
  return PDF_PREVIEW_SECTION_MAP[region] || [];
}

function resolvePdfPreviewHighlightRegions(region) {
  if (region === 'briefkopf' || region === 'banner' || region === 'firma' || region === 'line') {
    return ['briefkopf'];
  }
  return [region];
}

function setPdfTemplateSectionCollapsed(form, region, collapsed) {
  const fieldset = form.querySelector(`fieldset[data-preview-region="${region}"]`);
  if (!fieldset) return;
  fieldset.classList.toggle('is-collapsed', collapsed);
  fieldset.querySelector('.pdf-form-section__toggle')?.setAttribute('aria-expanded', String(!collapsed));
}

function collapseAllPdfTemplateSections(form) {
  form.querySelectorAll('fieldset[data-preview-region]').forEach((fieldset) => {
    setPdfTemplateSectionCollapsed(form, fieldset.dataset.previewRegion, true);
  });
}

function setPdfTemplatePreviewHighlight(previewRoot, regions) {
  if (!previewRoot) return;
  previewRoot.querySelectorAll('[data-region]').forEach((el) => {
    el.classList.toggle('is-active', regions.includes(el.dataset.region));
  });
}

function openPdfTemplateSectionsFromPreview(form, previewRoot, region) {
  const sections = resolvePdfPreviewSections(region);
  if (!sections.length) return;

  collapseAllPdfTemplateSections(form);
  sections.forEach((section) => setPdfTemplateSectionCollapsed(form, section, false));
  setPdfTemplatePreviewHighlight(previewRoot, resolvePdfPreviewHighlightRegions(region));

  form.querySelector(`fieldset[data-preview-region="${sections[0]}"]`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
  });
}

function enhancePdfTemplateCollapsibleSections(form) {
  if (!form || form.dataset.sectionsEnhanced === 'true') return;
  form.dataset.sectionsEnhanced = 'true';

  form.querySelectorAll('fieldset[data-preview-region]').forEach((fieldset) => {
    if (fieldset.querySelector('.pdf-form-section__toggle')) return;

    const legend = fieldset.querySelector('legend');
    const title = legend?.textContent?.trim() || 'Bereich';
    legend?.remove();

    const body = document.createElement('div');
    body.className = 'pdf-form-section__body';
    while (fieldset.firstChild) {
      body.appendChild(fieldset.firstChild);
    }

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pdf-form-section__toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = `
      <span class="pdf-form-section__title">${escapeHtml(title)}</span>
      <svg class="pdf-form-section__chevron" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;

    fieldset.classList.add('pdf-form-section', 'is-collapsed');
    fieldset.append(toggle, body);

    toggle.addEventListener('click', () => {
      const region = fieldset.dataset.previewRegion;
      const collapsed = !fieldset.classList.contains('is-collapsed');
      setPdfTemplateSectionCollapsed(form, region, collapsed);
    });
  });
}

function bindPdfTemplatePreviewSectionClicks(form, previewRoot) {
  if (!form || !previewRoot || previewRoot.dataset.sectionClicksBound === 'true') return;
  previewRoot.dataset.sectionClicksBound = 'true';

  previewRoot.querySelectorAll('[data-region]').forEach((el) => {
    if (!resolvePdfPreviewSections(el.dataset.region).length) return;

    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute(
      'aria-label',
      `${el.querySelector('.pdf-layout-preview__tag')?.textContent?.trim() || 'Bereich'} bearbeiten`
    );

    const activate = () => openPdfTemplateSectionsFromPreview(form, previewRoot, el.dataset.region);
    el.addEventListener('click', activate);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
  });
}

function bindPdfTemplateFormHighlight(form, previewRoot) {
  if (!form || !previewRoot || form.dataset.highlightBound === 'true') return;
  form.dataset.highlightBound = 'true';
  const setActiveRegions = (regions) => {
    setPdfTemplatePreviewHighlight(previewRoot, regions);
  };
  form.querySelectorAll('[data-preview-region]').forEach((fieldset) => {
    fieldset.addEventListener('focusin', () => {
      const region = fieldset.dataset.previewRegion;
      setPdfTemplateSectionCollapsed(form, region, false);
      setActiveRegions(resolvePdfPreviewHighlightRegions(region));
    });
  });
  form.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!form.contains(document.activeElement)) setActiveRegions([]);
    }, 0);
  });
}

function getPdfLayoutVariant(scope) {
  return normalizePdfLayoutVariant(state.pdfLayout?.[scope] ?? 1);
}

function pdfLayoutVariantKey(scope) {
  return scope === 'angebot' ? 'angebotVariant' : 'rechnungVariant';
}

function ensurePdfTemplatePreview(form, previewRoot, type, variant = 1) {
  form.querySelectorAll('[data-pdf-shared-fields]').forEach((container) => {
    mountPdfTemplateFormSections(container, type);
  });
  const normalized = normalizePdfLayoutVariant(variant);
  const needsRebuild =
    !previewRoot.querySelector('.pdf-layout-preview__sheet') ||
    previewRoot.dataset.previewType !== type ||
    Number(previewRoot.dataset.previewVariant) !== normalized;
  if (needsRebuild) {
    previewRoot.innerHTML = createPdfLayoutPreviewMarkup(type, normalized);
    previewRoot.dataset.previewType = type;
    previewRoot.dataset.previewVariant = String(normalized);
    delete previewRoot.dataset.sectionClicksBound;
  }
}

async function renderPdfTemplateView(view, { syncLayoutFromTemplate = false } = {}) {
  const isAngebot = view === 'pdf-vorlage-angebot';
  const scope = isAngebot ? 'angebot' : 'rechnung';
  const form = isAngebot ? els.pdfAngebotForm : els.pdfRechnungForm;
  const previewRoot = isAngebot ? els.pdfPreviewAngebot : els.pdfPreviewRechnung;
  const type = isAngebot ? 'angebot' : 'rechnung';
  if (!form || !previewRoot) return;

  const tpl = await loadPdfTemplate();
  if (!state.pdfLayout) state.pdfLayout = { angebot: 1, rechnung: 1 };
  if (syncLayoutFromTemplate) {
    state.pdfLayout[scope] = normalizePdfLayoutVariant(tpl.layout?.[pdfLayoutVariantKey(scope)]);
  }
  syncPdfLayoutTabs(scope);

  const variant = getPdfLayoutVariant(scope);
  ensurePdfTemplatePreview(form, previewRoot, type, variant);
  enhancePdfTemplateCollapsibleSections(form);
  collapseAllPdfTemplateSections(form);
  setPdfTemplatePreviewHighlight(previewRoot, []);
  bindPdfTemplatePreviewSectionClicks(form, previewRoot);
  if (isAngebot) fillPdfTemplateAngebotForm(form, tpl);
  else fillPdfTemplateRechnungForm(form, tpl);
  syncColorHexFields(form);
  updatePdfTemplatePreview(form, previewRoot, type, variant);
  setPdfTemplateStatus(form, '');
}

async function handlePdfTemplateSubmit(e, type) {
  e.preventDefault();
  const form = e.target;
  const scope = type;
  const variantKey = pdfLayoutVariantKey(scope);
  try {
    const patch =
      type === 'angebot'
        ? templatePatchFromAngebotPage(form)
        : templatePatchFromRechnungPage(form);
    const current = getPdfTemplate();
    await savePdfTemplate({
      ...current,
      ...patch,
      layout: {
        ...current.layout,
        ...patch.layout,
        [variantKey]: getPdfLayoutVariant(scope),
      },
    });
    setPdfTemplateStatus(form, 'Vorlage gespeichert.');
  } catch (err) {
    setPdfTemplateStatus(form, err.message, true);
  }
}

async function handlePdfTemplateReset(form, type) {
  if (!confirm('PDF-Vorlage auf Standardwerte zurücksetzen? Gespeicherte Bilder gehen verloren.')) {
    return;
  }
  const current = getPdfTemplate();
  const defaults = getDefaultPdfTemplate();
  defaults.angebot = {
    ...defaults.angebot,
    nummerSchema: current.angebot?.nummerSchema ?? defaults.angebot?.nummerSchema,
  };
  defaults.rechnung = {
    ...defaults.rechnung,
    nummerSchema: current.rechnung?.nummerSchema ?? defaults.rechnung?.nummerSchema,
  };
  const isAngebot = type === 'angebot';
  const scope = type;
  const previewRoot = isAngebot ? els.pdfPreviewAngebot : els.pdfPreviewRechnung;
  try {
    await savePdfTemplate(defaults);
    if (!state.pdfLayout) state.pdfLayout = { angebot: 1, rechnung: 1 };
    state.pdfLayout[scope] = normalizePdfLayoutVariant(defaults.layout?.[pdfLayoutVariantKey(scope)]);
    syncPdfLayoutTabs(scope);
    if (isAngebot) fillPdfTemplateAngebotForm(form, defaults);
    else fillPdfTemplateRechnungForm(form, defaults);
    syncColorHexFields(form);
    const variant = getPdfLayoutVariant(scope);
    ensurePdfTemplatePreview(form, previewRoot, type, variant);
    bindPdfTemplatePreviewSectionClicks(form, previewRoot);
    updatePdfTemplatePreview(form, previewRoot, type, variant);
    setPdfTemplateStatus(form, 'Standardvorlage wiederhergestellt.');
  } catch (err) {
    setPdfTemplateStatus(form, err.message, true);
  }
}

async function handlePdfTemplateImage(form, previewRoot, type, kind, file) {
  if (!form || !file) return;
  try {
    const dataUrl = await readImageFileAsDataUrl(file, kind);
    if (kind === 'logo') {
      form.dataset.logoData = dataUrl;
      updateImagePreview(form.querySelector('[data-preview="logo"]'), dataUrl);
    } else {
      form.dataset.headerData = dataUrl;
      updateImagePreview(form.querySelector('[data-preview="header"]'), dataUrl);
    }
    updatePdfTemplatePreview(form, previewRoot, type, getPdfLayoutVariant(type));
    setPdfTemplateStatus(form, '');
  } catch (err) {
    setPdfTemplateStatus(form, err.message, true);
  }
}

function clearPdfTemplateImage(form, previewRoot, type, kind, fileInput) {
  if (!form) return;
  if (kind === 'logo') {
    form.dataset.logoData = '';
    if (fileInput) fileInput.value = '';
    updateImagePreview(form.querySelector('[data-preview="logo"]'), '');
  } else {
    form.dataset.headerData = '';
    if (fileInput) fileInput.value = '';
    updateImagePreview(form.querySelector('[data-preview="header"]'), '');
  }
  updatePdfTemplatePreview(form, previewRoot, type, getPdfLayoutVariant(type));
}

function bindPdfTemplateForm(form, previewRoot, type) {
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  enhancePdfTemplateCollapsibleSections(form);
  bindColorFieldSync(form);
  bindPdfTemplatePreview(form, previewRoot, type, () => getPdfLayoutVariant(type));
  bindPdfTemplateFormHighlight(form, previewRoot);
  bindPdfTemplatePreviewSectionClicks(form, previewRoot);

  form.addEventListener('submit', (e) => handlePdfTemplateSubmit(e, type));
  form.querySelector('.pdf-template-reset')?.addEventListener('click', () => {
    handlePdfTemplateReset(form, type);
  });

  const logoFile = form.querySelector('.pdf-logo-file-input');
  const headerFile = form.querySelector('.pdf-header-file-input');
  logoFile?.addEventListener('change', (e) => {
    handlePdfTemplateImage(form, previewRoot, type, 'logo', e.target.files?.[0]);
  });
  headerFile?.addEventListener('change', (e) => {
    handlePdfTemplateImage(form, previewRoot, type, 'header', e.target.files?.[0]);
  });
  form.querySelectorAll('[data-clear-image]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.clearImage;
      clearPdfTemplateImage(
        form,
        previewRoot,
        type,
        kind,
        kind === 'logo' ? logoFile : headerFile
      );
    });
  });
}

function bindPdfTemplateForms() {
  bindPdfLayoutTabs();
  ensurePdfTemplatePreview(
    els.pdfAngebotForm,
    els.pdfPreviewAngebot,
    'angebot',
    getPdfLayoutVariant('angebot')
  );
  ensurePdfTemplatePreview(
    els.pdfRechnungForm,
    els.pdfPreviewRechnung,
    'rechnung',
    getPdfLayoutVariant('rechnung')
  );
  bindPdfTemplateForm(els.pdfAngebotForm, els.pdfPreviewAngebot, 'angebot');
  bindPdfTemplateForm(els.pdfRechnungForm, els.pdfPreviewRechnung, 'rechnung');
  syncPdfLayoutTabs('angebot');
  syncPdfLayoutTabs('rechnung');
}

function syncPdfLayoutTabs(scope) {
  const viewId = scope === 'rechnung' ? 'view-pdf-vorlage-rechnung' : 'view-pdf-vorlage-angebot';
  const root = document.getElementById(viewId);
  if (!root) return;

  const activeLayout = getPdfLayoutVariant(scope);
  root.querySelectorAll('[data-pdf-layout-tab]').forEach((btn) => {
    const layout = Number(btn.dataset.pdfLayoutTab);
    const isActive = layout === activeLayout;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    const meta = PDF_LAYOUT_VARIANTS[layout];
    if (meta) btn.textContent = meta.label;
  });

  const variantMeta = PDF_LAYOUT_VARIANTS[activeLayout];
  const lead = root.querySelector('.pdf-vorlage-card__lead');
  if (lead && variantMeta) {
    lead.classList.remove('hidden');
    lead.textContent = variantMeta.hint;
  }

  const previewLabel = root.querySelector('.pdf-vorlage-preview-label');
  if (previewLabel && variantMeta) {
    previewLabel.textContent = `Vorschau · ${variantMeta.label}`;
  }
}

function setPdfLayoutTab(scope, layout) {
  if (!state.pdfLayout) state.pdfLayout = { angebot: 1, rechnung: 1 };
  const normalized = normalizePdfLayoutVariant(layout);
  if (getPdfLayoutVariant(scope) === normalized) {
    syncPdfLayoutTabs(scope);
    return;
  }
  state.pdfLayout[scope] = normalized;
  syncPdfLayoutTabs(scope);
  renderPdfTemplateView(scope === 'rechnung' ? 'pdf-vorlage-rechnung' : 'pdf-vorlage-angebot');
}

function bindPdfLayoutTabs() {
  document.querySelectorAll('[data-pdf-layout-tabs]').forEach((tablist) => {
    if (tablist.dataset.bound === 'true') return;
    tablist.dataset.bound = 'true';
    const scope = tablist.dataset.pdfLayoutTabs;
    tablist.querySelectorAll('[data-pdf-layout-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setPdfLayoutTab(scope, Number(btn.dataset.pdfLayoutTab));
      });
    });
  });
}

async function renderArchiv() {
  const q = (els.archivSuche?.value || '').trim().toLowerCase();
  els.archivListe.innerHTML = '<p class="empty">Lade Angebote…</p>';

  try {
    let angebote = await getAllAngebote();

    if (q) {
      angebote = angebote.filter(
        (a) =>
        a.angebotNr.toLowerCase().includes(q) ||
        a.kunde.name.toLowerCase().includes(q)
      );
    }

    if (angebote.length === 0) {
      els.archivListe.innerHTML = `<p class="empty">${
        q ? 'Keine Angebote gefunden.' : 'Noch keine Angebote gespeichert. Erstelle dein erstes Angebot!'
      }</p>`;
      return;
    }

    els.archivListe.innerHTML = angebote
      .map((a) => {
        const posten = resolvePostenDetails(a.posten);
        const { brutto } = berechneSummenAusPosten(posten);
        const kunde = a.kunde.name || 'Ohne Kundenname';
        const datum = formatDatum(new Date(a.aktualisiertAm || a.erstelltAm));

        return `
        <article class="archiv-item" data-id="${a.id}">
          <div class="archiv-info">
            <div class="archiv-top">
              <strong>${a.angebotNr}</strong>
              <span class="archiv-betrag">${formatEuro(brutto)}</span>
            </div>
            <p class="archiv-kunde">${kunde}</p>
            <p class="archiv-meta">Zuletzt bearbeitet: ${datum} · ${posten.length} Posten</p>
          </div>
          <div class="archiv-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-action="rechnung" data-id="${a.id}">Rechnung erstellen</button>
            <button type="button" class="btn btn-ghost btn-sm" data-action="pdf" data-id="${a.id}">PDF ansehen</button>
            <button type="button" class="btn btn-ghost btn-sm" data-action="edit" data-id="${a.id}">Bearbeiten</button>
            <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${a.id}">Löschen</button>
          </div>
        </article>
      `;
      })
      .join('');
  } catch (err) {
    els.archivListe.innerHTML = `<p class="empty">Fehler beim Laden: ${err.message}</p>`;
  }
}

async function renderRechnungArchiv() {
  const q = (els.rechnungArchivSuche?.value || '').trim().toLowerCase();
  els.rechnungArchivListe.innerHTML = '<p class="empty">Lade Rechnungen…</p>';

  try {
    let rechnungen = await getAllRechnungen();

    if (q) {
      rechnungen = rechnungen.filter(
        (r) =>
          r.rechnungNr.toLowerCase().includes(q) ||
          r.kunde.name.toLowerCase().includes(q) ||
          (r.angebotNr || '').toLowerCase().includes(q)
      );
    }

    if (rechnungen.length === 0) {
      els.rechnungArchivListe.innerHTML = `<p class="empty">${
        q ? 'Keine Rechnungen gefunden.' : 'Noch keine Rechnungen gespeichert. Erstelle deine erste Rechnung!'
      }</p>`;
      return;
    }

    els.rechnungArchivListe.innerHTML = rechnungen
      .map((r) => {
        const posten = resolvePostenDetails(r.posten);
        const { brutto } = berechneSummenAusPosten(posten);
        const kunde = r.kunde.name || 'Ohne Kundenname';
        const datum = formatDatum(new Date(r.aktualisiertAm || r.erstelltAm));
        const angebotHint = r.angebotNr
          ? `<p class="archiv-meta">Bezug: ${r.angebotNr}</p>`
          : '';

        return `
        <article class="archiv-item" data-id="${r.id}">
          <div class="archiv-info">
            <div class="archiv-top">
              <strong>${r.rechnungNr}</strong>
              <span class="archiv-betrag">${formatEuro(brutto)}</span>
            </div>
            <p class="archiv-kunde">${kunde}</p>
            ${angebotHint}
            <p class="archiv-meta">Zuletzt bearbeitet: ${datum} · ${posten.length} Posten</p>
          </div>
          <div class="archiv-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-action="pdf" data-id="${r.id}">PDF ansehen</button>
            <button type="button" class="btn btn-ghost btn-sm" data-action="edit" data-id="${r.id}">Bearbeiten</button>
            <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${r.id}">Löschen</button>
          </div>
        </article>
      `;
      })
      .join('');
  } catch (err) {
    els.rechnungArchivListe.innerHTML = `<p class="empty">Fehler beim Laden: ${err.message}</p>`;
  }
}

function resetKundenForm() {
  state.editingKundeId = null;
  els.kundenForm.reset();
  els.kundenFormTitle.textContent = 'Neuer Kunde';
  els.kundenFormReset.classList.add('hidden');
}

function closeKundenDetail() {
  state.detailKundeId = null;
  resetKundenObjektForm();
  resetKundenForm();
  els.kundenDetail?.classList.add('hidden');
  els.kundenFormSection?.classList.remove('hidden');
}

async function openKundenDetail(kundeId) {
  state.detailKundeId = kundeId;
  resetKundenObjektForm();
  els.kundenFormSection?.classList.add('hidden');
  els.kundenDetail?.classList.remove('hidden');
  await refreshKundenDetail();
}

async function refreshKundenDetail() {
  if (!state.detailKundeId || !els.kundenDetail) return;

  try {
    const kunde = await getKunde(state.detailKundeId);
    if (!kunde) {
      closeKundenDetail();
      return;
    }

    const [angebote, rechnungen] = await Promise.all([getAllAngebote(), getAllRechnungen()]);
    const { angebote: kAngebote, rechnungen: kRechnungen } = dokumenteFuerKunde(
      kunde.id,
      kunde.name,
      angebote,
      rechnungen
    );

    els.kundenDetailTitle.textContent = kunde.name;
    const adresseHtml = formatAdresseHtml(kunde);
    els.kundenDetailAdresse.innerHTML = adresseHtml || '—';
    setKundenDetailContact(els.kundenDetailTelefon, kunde.telefon, 'tel');
    setKundenDetailContact(els.kundenDetailEmail, kunde.email, 'email');

    const notiz = (kunde.notiz || '').trim();
    if (notiz) {
      els.kundenDetailNotiz.textContent = notiz;
      els.kundenDetailNotizWrap.classList.remove('hidden');
    } else {
      els.kundenDetailNotiz.textContent = '';
      els.kundenDetailNotizWrap.classList.add('hidden');
    }

    els.kundenDetailDokumente.innerHTML = renderKundenDokumenteHtml(kAngebote, kRechnungen);
    await renderKundenObjekteSection(kunde.id);
  } catch (err) {
    els.kundenDetailDokumente.innerHTML = `<p class="empty">Fehler beim Laden: ${escapeHtml(err.message)}</p>`;
    if (els.kundenDetailObjekteListe) {
      els.kundenDetailObjekteListe.innerHTML = '';
    }
  }
}

function loadKundeIntoForm(kunde) {
  closeKundenDetail();
  state.editingKundeId = kunde.id;
  els.kundenFormName.value = kunde.name;
  setAdresseFieldPair(els.kundenFormStrasse, els.kundenFormPlzOrt, kunde);
  els.kundenFormTelefon.value = kunde.telefon || '';
  els.kundenFormEmail.value = kunde.email || '';
  els.kundenFormNotiz.value = kunde.notiz || '';
  els.kundenFormTitle.textContent = 'Kunde bearbeiten';
  els.kundenFormReset.classList.remove('hidden');
  showView('kunden');
}

async function refreshPostenEditors() {
  angebotPostenEditor.render();
  rechnungPostenEditor.render();
}

function resetKatalogForm() {
  state.editingKatalogPostenId = null;
  els.katalogForm?.reset();
  if (els.katalogFormTitle) els.katalogFormTitle.textContent = 'Neuer Katalog-Posten';
  els.katalogFormReset?.classList.add('hidden');
}

function fillKatalogForm(posten) {
  state.editingKatalogPostenId = posten.id;
  els.katalogFormBezeichnung.value = posten.bezeichnung || '';
  els.katalogFormBeschreibung.value = posten.beschreibung || '';
  els.katalogFormPreisStk.value =
    posten.preisStk != null && posten.preisStk !== '' ? String(posten.preisStk).replace('.', ',') : '';
  els.katalogFormPreisStd.value =
    posten.preisStd != null && posten.preisStd !== '' ? String(posten.preisStd).replace('.', ',') : '';
  if (els.katalogFormTitle) els.katalogFormTitle.textContent = 'Katalog-Posten bearbeiten';
  els.katalogFormReset?.classList.remove('hidden');
  els.katalogFormSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renderKatalogView() {
  const q = state.katalogSuche.trim().toLowerCase();
  els.katalogListe.innerHTML = '<p class="empty">Lade Katalog…</p>';

  try {
    const posten = await loadKatalogPosten();
    let filtered = posten;

    if (q) {
      filtered = posten.filter(
        (p) =>
          p.bezeichnung.toLowerCase().includes(q) ||
          (p.beschreibung || '').toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      els.katalogListe.innerHTML = `<p class="empty">${
        q ? 'Keine Posten gefunden.' : 'Noch keine Katalog-Posten angelegt.'
      }</p>`;
      return;
    }

    els.katalogListe.innerHTML = filtered
      .map((p) => {
        const preisStk = formatEuro(p.preisStk ?? 0);
        const preisStd = formatEuro(p.preisStd ?? 0);
        return `
        <article class="katalog-posten-item" data-id="${p.id}">
          <div class="katalog-posten-item__main">
            <h3>${escapeHtml(p.bezeichnung)}</h3>
            ${p.beschreibung ? `<p class="katalog-posten-item__desc">${escapeHtml(p.beschreibung)}</p>` : ''}
            <p class="katalog-posten-item__preise">${preisStk} / Stk. · ${preisStd} / Std.</p>
          </div>
          <div class="katalog-posten-item__actions">
            <button type="button" class="btn btn-ghost btn-sm" data-action="edit-katalog-posten" data-id="${p.id}">Bearbeiten</button>
            <button type="button" class="btn btn-danger btn-sm" data-action="delete-katalog-posten" data-id="${p.id}">Löschen</button>
          </div>
        </article>`;
      })
      .join('');
  } catch (err) {
    els.katalogListe.innerHTML = `<p class="empty">Fehler beim Laden: ${escapeHtml(err.message)}</p>`;
  }
}

function bindPreisBlurFormat(...fields) {
  fields.forEach((field) => {
    field?.addEventListener('focusout', () => {
      const formatted = formatPreisInputDisplay(field.value);
      if (formatted !== null) field.value = formatted;
    });
  });
}

async function saveKatalogForm(e) {
  e.preventDefault();

  const bezeichnung = els.katalogFormBezeichnung.value.trim();
  if (!bezeichnung) {
    alert('Bitte eine Bezeichnung eingeben.');
    els.katalogFormBezeichnung.focus();
    return;
  }

  const preisStkRaw = parsePreisInput(els.katalogFormPreisStk.value);
  const preisStdRaw = parsePreisInput(els.katalogFormPreisStd.value);
  const preisStk = Number.isNaN(preisStkRaw) ? 0 : Math.max(0, preisStkRaw);
  const preisStd = Number.isNaN(preisStdRaw) ? 0 : Math.max(0, preisStdRaw);

  const jetzt = new Date().toISOString();
  let erstelltAm = jetzt;
  if (state.editingKatalogPostenId) {
    const bestehend = await getKatalogPostenById(state.editingKatalogPostenId);
    erstelltAm = bestehend?.erstelltAm || jetzt;
  }

  const posten = {
    id: state.editingKatalogPostenId || createKatalogPostenId(),
    bezeichnung,
    beschreibung: els.katalogFormBeschreibung.value.trim(),
    preisStk,
    preisStd,
    erstelltAm,
    aktualisiertAm: jetzt,
  };

  try {
    await saveKatalogPosten(posten);
    state.katalogSuche = '';
    if (els.katalogSuche) els.katalogSuche.value = '';
    resetKatalogForm();
    await renderKatalogView();
    refreshPostenEditors();
  } catch (err) {
    alert(
      `Speichern fehlgeschlagen: ${err.message}\n\nBitte prüfen, ob der Server läuft (npm run dev).`
    );
  }
}

async function renderKundenView() {
  const q = state.kundenSuche.trim().toLowerCase();
  const showRechnungen = state.bereich === 'rechnungen';
  els.kundenListe.innerHTML = '<p class="empty">Lade Kunden…</p>';

  try {
    const [kunden, angebote, rechnungen] = await Promise.all([
      getAllKunden(),
      getAllAngebote(),
      getAllRechnungen(),
    ]);

    let filtered = kunden;

    if (q) {
      filtered = kunden.filter((k) => kundeMatchesSearch(k, q));
    }

    if (filtered.length === 0) {
      state.expandedKundeDokumenteId = null;
      els.kundenListe.innerHTML = `<p class="empty">${
        q ? 'Keine Kunden gefunden.' : 'Noch keine Kunden angelegt.'
      }</p>`;
      return;
    }

    if (!filtered.some((k) => k.id === state.expandedKundeDokumenteId)) {
      state.expandedKundeDokumenteId = null;
    }

    els.kundenListe.innerHTML = filtered
      .map((k) => {
        const kontakt = [k.telefon, k.email].filter((v) => (v || '').trim()).join(' · ');
        const docs = dokumenteFuerKunde(k.id, k.name, angebote, rechnungen);
        const kundenDokumente = showRechnungen ? docs.rechnungen : docs.angebote;
        const docCount = kundenDokumente.length;
        const isExpanded = state.expandedKundeDokumenteId === k.id;
        const countLabel = showRechnungen
          ? formatRechnungenCount(docCount)
          : formatAngeboteCount(docCount);
        const toggleLabel = showRechnungen ? 'Rechnungen anzeigen' : 'Angebote anzeigen';
        const listHtml = showRechnungen
          ? renderKundenRechnungenListHtml(kundenDokumente)
          : renderKundenAngeboteListHtml(kundenDokumente);

        return `
        <article class="kunden-item" data-id="${k.id}">
          <div class="kunden-item__header">
            <div class="kunden-info">
              <h3>${escapeHtml(k.name)}</h3>
              ${formatAdresseHtml(k) ? `<p>${formatAdresseHtml(k)}</p>` : ''}
              ${kontakt ? `<p class="kunden-info__kontakt">${escapeHtml(kontakt)}</p>` : ''}
            </div>
            <div class="kunden-actions">
              <button type="button" class="btn btn-primary btn-sm" data-action="show-kunde-detail" data-id="${k.id}">Öffnen</button>
              <button type="button" class="btn btn-ghost btn-sm" data-action="edit-kunde" data-id="${k.id}">Bearbeiten</button>
              <button type="button" class="btn btn-danger btn-sm" data-action="delete-kunde" data-id="${k.id}">Löschen</button>
            </div>
          </div>
          <div class="kunden-item__dokumente">
            <span class="kunden-item__dokumente-count">${countLabel}</span>
            ${
              docCount
                ? `<button type="button" class="btn btn-ghost btn-sm" data-action="toggle-kunde-dokumente" data-id="${k.id}" aria-expanded="${isExpanded}">
                    ${isExpanded ? 'Ausblenden' : toggleLabel}
                  </button>`
                : ''
            }
          </div>
          ${isExpanded ? `<div class="kunden-item__dokumente-panel">${listHtml}</div>` : ''}
        </article>
      `;
      })
      .join('');

    if (state.detailKundeId) {
      await refreshKundenDetail();
    }
  } catch (err) {
    els.kundenListe.innerHTML = `<p class="empty">Fehler beim Laden: ${err.message}</p>`;
  }
}

async function renderKundenPicker() {
  const q = state.kundenPickerSuche.trim().toLowerCase();
  els.kundenPickerListe.innerHTML = '<p class="empty">Lade Kunden…</p>';

  try {
    let kunden = await getAllKunden();

    if (q) {
      kunden = kunden.filter((k) => kundeMatchesSearch(k, q));
    }

    if (kunden.length === 0) {
      els.kundenPickerListe.innerHTML = `<p class="empty">${
        q ? 'Keine Kunden gefunden.' : 'Noch keine Kunden angelegt. Lege zuerst einen Kunden an.'
      }</p>`;
      return;
    }

    els.kundenPickerListe.innerHTML = kunden
      .map(
        (k) => `
        <article class="kunden-picker-item" data-id="${k.id}" tabindex="0">
          <div class="kunden-info">
            <h3>${k.name}</h3>
            ${formatAdresseInline(k) ? `<p>${escapeHtml(formatAdresseInline(k))}</p>` : ''}
          </div>
        </article>
      `
      )
      .join('');
  } catch (err) {
    els.kundenPickerListe.innerHTML = `<p class="empty">Fehler beim Laden: ${err.message}</p>`;
  }
}

function openKundenModal(forTarget) {
  state.kundenPickerFor = forTarget || (state.bereich === 'rechnungen' ? 'rechnung' : 'angebot');
  if (state.kundenPickerFor === 'rechnung') {
    rechnungPostenEditor.flushEntwurfIfComplete();
  } else {
    angebotPostenEditor.flushEntwurfIfComplete();
  }
  state.kundenPickerSuche = '';
  els.kundenPickerSuche.value = '';
  els.kundenModal.classList.remove('hidden');
  els.kundenModal.setAttribute('aria-hidden', 'false');
  renderKundenPicker();
  els.kundenPickerSuche.focus();
}

function closeKundenModal() {
  els.kundenModal.classList.add('hidden');
  els.kundenModal.setAttribute('aria-hidden', 'true');
}

async function saveKundenForm(e) {
  e.preventDefault();

  const name = els.kundenFormName.value.trim();
  if (!name) {
    alert('Bitte einen Firmennamen oder Namen eingeben.');
    els.kundenFormName.focus();
    return;
  }

  const jetzt = new Date().toISOString();
  const isEdit = Boolean(state.editingKundeId);
  const bestehend = isEdit ? await getKunde(state.editingKundeId) : null;

  const formAdresse = readAdresseFieldPair(els.kundenFormStrasse, els.kundenFormPlzOrt);
  const kunde = {
    id: isEdit ? state.editingKundeId : createKundeId(),
    name,
    strasse: formAdresse.strasse,
    plzOrt: formAdresse.plzOrt,
    adresse: formAdresse.adresse,
    telefon: els.kundenFormTelefon.value.trim(),
    email: els.kundenFormEmail.value.trim(),
    notiz: els.kundenFormNotiz.value.trim(),
    erstelltAm: bestehend?.erstelltAm || jetzt,
    aktualisiertAm: jetzt,
  };

  try {
    await saveKunde(kunde);
    state.kundenSuche = '';
    els.kundenSuche.value = '';
    const wasDetail = state.detailKundeId === kunde.id;
    resetKundenForm();
    await renderKundenView();
    if (wasDetail) {
      await openKundenDetail(kunde.id);
    }
  } catch (err) {
    alert(
      `Speichern fehlgeschlagen: ${err.message}\n\nBitte prüfen, ob der Server läuft (npm run dev).`
    );
  }
}

async function saveKundenObjektForm(e) {
  e.preventDefault();
  if (!state.detailKundeId) return;

  const name = els.kundenObjektName.value.trim();
  if (!name) {
    alert('Bitte einen Objektnamen eingeben.');
    els.kundenObjektName.focus();
    return;
  }

  const jetzt = new Date().toISOString();
  let erstelltAm = jetzt;
  if (state.editingObjektId) {
    const objekte = await listKundenObjekte(state.detailKundeId);
    const bestehend = objekte.find((o) => o.id === state.editingObjektId);
    if (bestehend) erstelltAm = bestehend.erstelltAm;
  }

  const objAdresse = readAdresseFieldPair(els.kundenObjektStrasse, els.kundenObjektPlzOrt);
  const objekt = {
    id: state.editingObjektId || createKundenObjektId(),
    name,
    strasse: objAdresse.strasse,
    plzOrt: objAdresse.plzOrt,
    adresse: objAdresse.adresse,
    typ: els.kundenObjektTyp.value === 'rechnung' ? 'rechnung' : 'einsatz',
    erstelltAm,
    aktualisiertAm: jetzt,
  };

  try {
    await saveKundenObjekt(state.detailKundeId, objekt);
    resetKundenObjektForm();
    await renderKundenObjekteSection(state.detailKundeId);
  } catch (err) {
    alert(`Objekt konnte nicht gespeichert werden: ${err.message}`);
  }
}

async function speichernUndPdf() {
  angebotPostenEditor.flushEntwurfIfComplete();
  const posten = angebotPostenEditor.getAusgewaehltePosten();
  if (posten.length === 0 || !isAngebotKopfComplete()) return;

  els.pdfBtn.disabled = true;

  try {
    const angebot = await getFormAngebot();
    const formKunde = angebot.kunde;
    const resolved = await resolveKundeIdForSave(
      formKunde.name,
      formKunde,
      state.angebot.selectedKundeId
    );
    angebot.kundeId = resolved.kundeId;
    angebot.kunde = { ...formKunde, ...resolved.kunde };
    state.angebot.selectedKundeId = resolved.kundeId;
    updateKundeHinweis();
    await saveAngebot(angebot);
    state.angebot.editingId = angebot.id;
    updatePageHeader();
    downloadPdf(angebot, posten);
  } catch (err) {
    alert(`Speichern fehlgeschlagen: ${err.message}`);
  } finally {
    angebotPostenEditor.render();
  }
}

async function speichernUndRechnungPdf() {
  rechnungPostenEditor.flushEntwurfIfComplete();
  const posten = rechnungPostenEditor.getAusgewaehltePosten();
  if (posten.length === 0 || !isRechnungKopfComplete()) return;

  els.rechnungPdfBtn.disabled = true;

  try {
    const rechnung = await getFormRechnung();
    const formKunde = rechnung.kunde;
    const resolved = await resolveKundeIdForSave(
      formKunde.name,
      formKunde,
      state.rechnung.selectedKundeId
    );
    rechnung.kundeId = resolved.kundeId;
    rechnung.kunde = { ...formKunde, ...resolved.kunde };
    state.rechnung.selectedKundeId = resolved.kundeId;
    updateRechnungKundeHinweis();
    await saveRechnung(rechnung);
    state.rechnung.editingId = rechnung.id;
    updateRechnungPageHeader();
    await downloadRechnungPdf(rechnung, posten);
  } catch (err) {
    alert(`Speichern fehlgeschlagen: ${err.message}`);
  } finally {
    rechnungPostenEditor.render();
  }
}

let appFlowGeneration = 0;

function invalidateAppFlow() {
  appFlowGeneration += 1;
  closeOnboarding();
}

function isActiveAppFlow(flowId) {
  return flowId === appFlowGeneration && isLoggedIn();
}

function showLanding() {
  invalidateAppFlow();
  pendingRegistrationPlan = 'free';
  els.landing?.classList.remove('hidden');
  els.loginScreen.classList.add('hidden');
  els.app.classList.add('hidden');
}

function setAuthTab(mode) {
  const isLogin = mode !== 'register';
  document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.authTab === (isLogin ? 'login' : 'register'));
  });
  els.loginForm.classList.toggle('hidden', !isLogin);
  els.registerForm.classList.toggle('hidden', isLogin);
  els.authTitle.textContent = isLogin ? 'Anmelden' : 'Registrieren';
  els.loginError.classList.add('hidden');
  els.registerError.classList.add('hidden');
  if (!isLogin) updateRegisterPlanNote();
}

function showLogin(mode = 'login') {
  invalidateAppFlow();
  els.landing?.classList.add('hidden');
  els.loginScreen.classList.remove('hidden');
  els.app.classList.add('hidden');
  setAuthTab(mode);
  els.loginPass.value = '';
}

async function restoreLoginView() {
  state.bereich = loadSavedBereich();
  const startView = getDefaultViewForBereich();
  state.view = startView;
  state.lastNavBarView = startView;

  await resetForm();
  await resetRechnungForm();

  syncBereichSwitcher();
  syncBereichNav();
  showView(startView);
}

async function showApp() {
  const flowId = ++appFlowGeneration;

  els.landing?.classList.add('hidden');
  els.loginScreen.classList.add('hidden');
  els.app.classList.remove('hidden');
  syncProfileButton();
  syncAdminNav();

  if (!state.appStarted) {
    bindAppEvents();
    angebotPostenEditor.bindEvents();
    rechnungPostenEditor.bindEvents();
    try {
      await loadPdfTemplate();
      if (!isActiveAppFlow(flowId)) return;
      await loadKatalogPosten();
      if (!isActiveAppFlow(flowId)) return;
    } catch (err) {
      console.error('App-Initialisierung fehlgeschlagen:', err);
    }
    if (!isActiveAppFlow(flowId)) return;
    state.appStarted = true;
  }

  if (!isActiveAppFlow(flowId)) return;
  await restoreLoginView();
  if (!isActiveAppFlow(flowId)) return;

  if (needsOnboarding()) {
    await openOnboarding();
  }
}

function bindAppEvents() {
  bindMainNav();
  bindAngebotKopfToggle();
  bindPostenKopfToggle();
  bindRechnungKopfToggle();
  bindRechnungPostenKopfToggle();
  bindFormPdfValidation();
  initKatalogModal({
    modal: els.katalogModal,
    liste: els.katalogModalListe,
    suche: els.katalogModalSuche,
    openButtons: [
      { button: els.katalogOeffnenBtn, editor: angebotPostenEditor },
      { button: els.rechnungKatalogOeffnenBtn, editor: rechnungPostenEditor },
    ],
  });
  els.profileBtn?.addEventListener('click', () => showView('profil'));
  els.profilAccountForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setProfilAccountStatus('');

    const name = els.profilTenantName?.value.trim() || '';
    if (!name) {
      setProfilAccountStatus('Firmenname ist erforderlich.', true);
      return;
    }

    try {
      await updateTenantName(name);
      syncProfileButton();
      setProfilAccountStatus('Firma wurde gespeichert.');
    } catch (err) {
      setProfilAccountStatus(err.message || 'Firma konnte nicht gespeichert werden.', true);
    }
  });
  els.profilPasswordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setProfilPasswordStatus('');

    const currentPassword = els.profilCurrentPassword?.value || '';
    const newPassword = els.profilNewPassword?.value || '';
    const confirmPassword = els.profilConfirmPassword?.value || '';

    if (newPassword !== confirmPassword) {
      setProfilPasswordStatus('Die neuen Passwörter stimmen nicht überein.', true);
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      els.profilPasswordForm?.reset();
      setProfilPasswordStatus('Passwort wurde erfolgreich geändert.');
    } catch (err) {
      setProfilPasswordStatus(err.message || 'Passwort konnte nicht geändert werden.', true);
    }
  });

  els.profilNummernForm?.addEventListener('input', () => {
    if (isAdmin()) updateProfilSchemaPreviews();
  });
  els.profilNummernForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAdmin()) return;

    setProfilNummernStatus('');

    const angebotSchema = String(els.profilAngebotNummerSchema?.value || '').trim();
    const rechnungSchema = String(els.profilRechnungNummerSchema?.value || '').trim();

    if (!angebotSchema || !schemaHasSequenceToken(angebotSchema)) {
      setProfilNummernStatus('Angebots-Schema braucht eine Laufnummer, z. B. {NR:3}.', true);
      els.profilAngebotNummerSchema?.focus();
      return;
    }
    if (!rechnungSchema || !schemaHasSequenceToken(rechnungSchema)) {
      setProfilNummernStatus('Rechnungs-Schema braucht eine Laufnummer, z. B. {NR:3}.', true);
      els.profilRechnungNummerSchema?.focus();
      return;
    }

    try {
      const angebotPatch = templatePatchFromForm(els.profilNummernForm, 'angebot-nummer');
      const rechnungPatch = templatePatchFromForm(els.profilNummernForm, 'rechnung-nummer');
      await savePdfTemplate({
        ...getPdfTemplate(),
        ...angebotPatch,
        ...rechnungPatch,
      });
      updateProfilSchemaPreviews();
      if (isPdfVorlageView(state.view)) {
        renderPdfTemplateView(state.view);
      }
      setProfilNummernStatus('Nummernschemas wurden gespeichert.');
    } catch (err) {
      setProfilNummernStatus(err.message || 'Nummernschemas konnten nicht gespeichert werden.', true);
    }
  });

  els.profilDeleteAccountBtn?.addEventListener('click', openProfilDeleteModal);
  els.profilPlanChangeBtn?.addEventListener('click', openProfilPlanModal);
  els.profilPlanModal?.querySelectorAll('[data-close-profil-plan-modal]').forEach((el) => {
    el.addEventListener('click', closeProfilPlanModal);
  });
  els.profilDeleteModal?.querySelectorAll('[data-close-profil-delete-modal]').forEach((el) => {
    el.addEventListener('click', closeProfilDeleteModal);
  });
  els.profilDeleteConfirmBtn?.addEventListener('click', async () => {
    setProfilDeleteStatus('');
    const plz = els.profilDeletePlz?.value || '';
    if (!String(plz).trim()) {
      setProfilDeleteStatus('Bitte geben Sie Ihre Postleitzahl ein.', true);
      els.profilDeletePlz?.focus();
      return;
    }

    try {
      invalidateAppFlow();
      await deleteAccount(plz);
      closeProfilDeleteModal();
      state.appStarted = false;
      showLanding();
    } catch (err) {
      setProfilDeleteStatus(err.message || 'Konto konnte nicht gelöscht werden.', true);
    }
  });

  if (els.pdfAngebotForm) {
    bindPdfTemplateForms();
  }

  els.resetBtn.addEventListener('click', () => resetForm());
  els.pdfBtn.addEventListener('click', () => speichernUndPdf());
  els.rechnungResetBtn?.addEventListener('click', () => resetRechnungForm());
  els.rechnungPdfBtn?.addEventListener('click', () => speichernUndRechnungPdf());

  els.kundeAuswahlBtn.addEventListener('click', () => openKundenModal('angebot'));
  els.kundeName.addEventListener('input', clearKundeAuswahl);
  els.rechnungKundeAuswahlBtn?.addEventListener('click', () => openKundenModal('rechnung'));
  els.rechnungKundeName?.addEventListener('input', clearRechnungKundeAuswahl);

  els.kundeAdresseAuswahl?.addEventListener('click', (e) => {
    handleAdresseAuswahlClick(
      state.angebot,
      angebotAdresseFields(),
      els.kundeAdresseAuswahl,
      els.kundeEinsatzortHinweis,
      e
    );
  });

  els.rechnungAdresseAuswahl?.addEventListener('click', (e) => {
    handleAdresseAuswahlClick(
      state.rechnung,
      rechnungAdresseFields(),
      els.rechnungAdresseAuswahl,
      els.rechnungEinsatzortHinweis,
      e
    );
  });

  const onAngebotAdresseInput = () => {
    markAdresseManuallyEdited(state.angebot, els.kundeAdresseAuswahl, els.kundeEinsatzortHinweis);
  };
  els.kundeStrasse?.addEventListener('input', onAngebotAdresseInput);
  els.kundePlzOrt?.addEventListener('input', onAngebotAdresseInput);

  const onRechnungAdresseInput = () => {
    markAdresseManuallyEdited(state.rechnung, els.rechnungAdresseAuswahl, els.rechnungEinsatzortHinweis);
  };
  els.rechnungKundeStrasse?.addEventListener('input', onRechnungAdresseInput);
  els.rechnungKundePlzOrt?.addEventListener('input', onRechnungAdresseInput);

  els.kundenForm?.addEventListener('submit', saveKundenForm);
  els.kundenFormReset?.addEventListener('click', resetKundenForm);

  els.katalogForm?.addEventListener('submit', saveKatalogForm);
  els.katalogFormReset?.addEventListener('click', resetKatalogForm);
  bindPreisBlurFormat(els.katalogFormPreisStk, els.katalogFormPreisStd);
  els.katalogNeuBtn?.addEventListener('click', () => {
    resetKatalogForm();
    els.katalogFormSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.katalogFormBezeichnung?.focus();
  });
  els.katalogSuche?.addEventListener('input', (e) => {
    state.katalogSuche = e.target.value;
    renderKatalogView();
  });
  els.katalogListe?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;

    try {
      if (action === 'edit-katalog-posten') {
        const posten = await getKatalogPostenById(id);
        if (posten) fillKatalogForm(posten);
        return;
      }

      if (action === 'delete-katalog-posten') {
        const posten = await getKatalogPostenById(id);
        if (!posten) return;
        if (!confirm(`Katalog-Posten „${posten.bezeichnung}" wirklich löschen?`)) return;
        await deleteKatalogPosten(id);
        if (state.editingKatalogPostenId === id) resetKatalogForm();
        await renderKatalogView();
        refreshPostenEditors();
      }
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  });

  els.kundenNeuBtn?.addEventListener('click', () => {
    if (state.detailKundeId) {
      state.detailKundeId = null;
      els.kundenDetail?.classList.add('hidden');
      els.kundenFormSection?.classList.remove('hidden');
    }
    resetKundenForm();
    els.kundenFormSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  els.kundenDetailClose?.addEventListener('click', closeKundenDetail);

  els.kundenDetailEdit?.addEventListener('click', async () => {
    if (!state.detailKundeId) return;
    try {
      const kunde = await getKunde(state.detailKundeId);
      if (kunde) loadKundeIntoForm(kunde);
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  });

  els.kundenDetailNeuAngebot?.addEventListener('click', async () => {
    if (!state.detailKundeId) return;
    try {
      const kunde = await getKunde(state.detailKundeId);
      if (kunde) await startNeuesAngebotForKunde(kunde);
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  });

  els.kundenDetailNeuRechnung?.addEventListener('click', async () => {
    if (!state.detailKundeId) return;
    try {
      const kunde = await getKunde(state.detailKundeId);
      if (kunde) await startNeueRechnungForKunde(kunde);
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  });

  els.kundenDetailDokumente?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    try {
      if (action === 'kunde-angebot-pdf') {
        const angebot = await getAngebot(id);
        if (angebot) openPdfPreview(angebot, resolvePostenDetails(angebot.posten));
        return;
      }
      if (action === 'kunde-angebot-edit') {
        const angebot = await getAngebot(id);
        if (angebot) await loadAngebotIntoForm(angebot);
        return;
      }
      if (action === 'kunde-rechnung-pdf') {
        const rechnung = await getRechnung(id);
        if (rechnung) openRechnungPdfPreview(rechnung, resolvePostenDetails(rechnung.posten));
        return;
      }
      if (action === 'kunde-rechnung-edit') {
        const rechnung = await getRechnung(id);
        if (rechnung) await loadRechnungIntoForm(rechnung);
      }
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  });

  els.kundenObjektForm?.addEventListener('submit', saveKundenObjektForm);
  els.kundenObjektCancel?.addEventListener('click', resetKundenObjektForm);

  els.kundenDetailObjekteListe?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !state.detailKundeId) return;
    const { action, id } = btn.dataset;

    try {
      const objekte = await listKundenObjekte(state.detailKundeId);
      const objekt = objekte.find((o) => o.id === id);
      if (!objekt) return;

      if (action === 'edit-objekt') {
        state.editingObjektId = objekt.id;
        els.kundenObjektName.value = objekt.name;
        setAdresseFieldPair(els.kundenObjektStrasse, els.kundenObjektPlzOrt, objekt);
        els.kundenObjektTyp.value = objekt.typ === 'rechnung' ? 'rechnung' : 'einsatz';
        els.kundenObjektCancel?.classList.remove('hidden');
        els.kundenObjektName.focus();
        return;
      }

      if (action === 'delete-objekt') {
        if (!confirm(`Objekt „${objekt.name}" wirklich löschen?`)) return;
        await deleteKundenObjekt(state.detailKundeId, id);
        if (state.editingObjektId === id) resetKundenObjektForm();
        await renderKundenObjekteSection(state.detailKundeId);
      }
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  });

  els.kundenSuche?.addEventListener('input', (e) => {
    state.kundenSuche = e.target.value;
    renderKundenView();
  });

  els.kundenPickerSuche.addEventListener('input', (e) => {
    state.kundenPickerSuche = e.target.value;
    renderKundenPicker();
  });

  els.kundenModal.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeKundenModal);
  });

  els.kundenPickerListe.addEventListener('click', async (e) => {
    const item = e.target.closest('.kunden-picker-item');
    if (!item) return;
    try {
      const kunde = await getKunde(item.dataset.id);
      if (kunde) applyPickerKunde(kunde);
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  });

  els.kundenListe.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const { action, id } = btn.dataset;

    try {
      if (action === 'show-kunde-detail') {
        await openKundenDetail(id);
        return;
      }

      if (action === 'toggle-kunde-dokumente') {
        state.expandedKundeDokumenteId = state.expandedKundeDokumenteId === id ? null : id;
        await renderKundenView();
        return;
      }

      if (action === 'kunde-angebot-rechnung') {
        const angebot = await getAngebot(id);
        if (angebot) await loadAngebotAsRechnungEntwurf(angebot);
        return;
      }

      if (action === 'kunde-angebot-pdf') {
        const angebot = await getAngebot(id);
        if (angebot) openPdfPreview(angebot, resolvePostenDetails(angebot.posten));
        return;
      }

      if (action === 'kunde-angebot-edit') {
        const angebot = await getAngebot(id);
        if (angebot) await loadAngebotIntoForm(angebot);
        return;
      }

      if (action === 'kunde-rechnung-pdf') {
        const rechnung = await getRechnung(id);
        if (rechnung) openRechnungPdfPreview(rechnung, resolvePostenDetails(rechnung.posten));
        return;
      }

      if (action === 'kunde-rechnung-edit') {
        const rechnung = await getRechnung(id);
        if (rechnung) await loadRechnungIntoForm(rechnung);
        return;
      }

      const kunde = await getKunde(id);
      if (!kunde) return;

      if (action === 'edit-kunde') {
        loadKundeIntoForm(kunde);
      } else if (action === 'delete-kunde') {
        if (confirm(`Kunde „${kunde.name}" wirklich löschen?`)) {
          await deleteKunde(id);
          if (state.editingKundeId === id) resetKundenForm();
          if (state.detailKundeId === id) closeKundenDetail();
          if (state.expandedKundeDokumenteId === id) state.expandedKundeDokumenteId = null;
          renderKundenView();
        }
      }
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.bereichSwitcherWrap?.classList.contains('is-open')) {
      closeBereichDropdown();
      return;
    }
    if (e.key === 'Escape' && !els.kundenModal.classList.contains('hidden')) {
      closeKundenModal();
    }
  });

  els.archivSuche?.addEventListener('input', renderArchiv);
  els.rechnungArchivSuche?.addEventListener('input', renderRechnungArchiv);

  els.archivListe.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const { action, id } = btn.dataset;

    try {
      const angebot = await getAngebot(id);
      if (!angebot) return;

      if (action === 'rechnung') {
        await loadAngebotAsRechnungEntwurf(angebot);
      } else if (action === 'pdf') {
        openPdfPreview(angebot, resolvePostenDetails(angebot.posten));
      } else if (action === 'edit') {
        await loadAngebotIntoForm(angebot);
      } else if (action === 'delete') {
        if (confirm(`Angebot „${angebot.angebotNr}" wirklich löschen?`)) {
          await deleteAngebot(id);
          if (state.angebot.editingId === id) await resetForm();
          renderArchiv();
        }
      }
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  });

  els.rechnungArchivListe?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const { action, id } = btn.dataset;

    try {
      const rechnung = await getRechnung(id);
      if (!rechnung) return;

      if (action === 'pdf') {
        openRechnungPdfPreview(rechnung, resolvePostenDetails(rechnung.posten));
      } else if (action === 'edit') {
        await loadRechnungIntoForm(rechnung);
      } else if (action === 'delete') {
        if (confirm(`Rechnung „${rechnung.rechnungNr}" wirklich löschen?`)) {
          await deleteRechnung(id);
          if (state.rechnung.editingId === id) await resetRechnungForm();
          renderRechnungArchiv();
        }
      }
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  });
}

function bindAuthEvents() {
  document.querySelectorAll('[data-landing-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.landingAction === 'register') {
        pendingRegistrationPlan = normalizeRegistrationPlan(btn.dataset.landingPlan);
        showLogin('register');
        return;
      }
      showLogin('login');
    });
  });

  els.loginBackBtn?.addEventListener('click', showLanding);

  document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      setAuthTab(tab.dataset.authTab);
    });
  });

  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.loginError.classList.add('hidden');
    try {
      await login(els.loginUser.value, els.loginPass.value);
      await showApp();
    } catch {
      els.loginError.classList.remove('hidden');
    }
  });

  els.registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.registerError.classList.add('hidden');
    try {
      await register(
        els.registerTenant.value,
        els.registerEmail.value,
        els.registerPass.value,
        pendingRegistrationPlan
      );
      await showApp();
    } catch (err) {
      els.registerError.textContent = err.message || 'Registrierung fehlgeschlagen.';
      els.registerError.classList.remove('hidden');
    }
  });

  els.logoutBtn.addEventListener('click', async () => {
    invalidateAppFlow();
    await logout();
    showLanding();
  });
}

async function bootstrap() {
  initTheme();
  initLegal();
  initLanding();
  initDatePickers();
  initOnboarding({
    onComplete: async () => {
      await resetForm();
      await resetRechnungForm();
    },
  });
  bindAuthEvents();
  const session = await refreshSession();
  if (session) await showApp();
  else showLanding();
}

bootstrap();
