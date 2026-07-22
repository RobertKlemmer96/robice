import { initLanding } from './landing.js';
import { initLegal } from './legal.js';
import {
  normalizeAdresse,
  adresseToLines,
  setAdresseFieldPair,
  readAdresseFieldPair,
  clearAdresseFieldPair,
} from './adresse.js';
import { loadDashboardData, renderDashboard } from './dashboard.js';
import { formatPlanLabel, normalizeRegistrationPlan, PLAN_LABELS, PLAN_PRICES, PLAN_TAGLINES, REGISTRATION_PLANS } from './plans.js';
import { formatPostenArt, normalizePostenArt } from './data.js';
import { login, logout, register, refreshSession, getCurrentUser, getCurrentTenant, getSession, changePassword, updateTenantName, isAdmin, isImpersonating, getImpersonation, isLoggedIn, needsOnboarding, deleteAccount } from './auth.js';
import {
  loadAdminUsers,
  loadAdminTenantDocuments,
  startAdminImpersonation,
  stopAdminImpersonation,
} from './adminUsers.js';
import { initOnboarding, openOnboarding, closeOnboarding } from './onboarding.js';
import { initKatalogModal } from './katalogModal.js';
import { initDatePickers, refreshDatePickers } from './datePicker.js';
import { deleteIconButton, editIconButton, mountIconButton } from './icons.js';
import { initTheme } from './theme.js';
import { applyI18n, getBereichMark, initI18n, onLocaleChange, syncBereichMarks, t } from './i18n.js';
import { initLangSwitcher } from './langSwitcher.js';
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
  getAngebotPdfAttachment,
  getRechnungPdfAttachment,
} from './pdf.js';
import { fetchMailStatus, sendDocumentPdf } from './documentMail.js';
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
  fillProfileFirmaForm,
  withProfileFirma,
  readImageFileAsDataUrl,
  updateImagePreview,
  formatRgbFromHex,
  parseRgbInput,
  rgbToHex,
} from './pdfTemplate.js';
import {
  bindPdfTemplatePreview,
  bindPdfPreviewRegionLabels,
  createPdfLayoutPreviewMarkup,
  mountPdfTemplateFormSections,
  normalizePdfLayoutVariant,
  refreshPdfTemplateFormLabels,
  syncPdfPreviewRegionLabels,
  updatePdfTemplatePreview,
  updateDocumentLayoutPreview,
} from './pdfTemplatePreview.js';
import { PDF_LAYOUT_VARIANTS } from './pdfLayoutVariants.js';
import {
  generiereAngebotsnummer as erzeugeAngebotsnummer,
  previewAngebotsnummer,
  generiereRechnungsnummer as erzeugeRechnungsnummer,
  previewRechnungsnummer,
  getZahlungszielTage,
  addDaysIso,
} from './dokumentnummer.js';
import { generiereKundennummer } from './kundennummer.js';
import {
  normalizeKundeAnrede,
  formatKundeAnredeLabel,
  formatKundeDisplayName,
} from './kundeStammdaten.js';
import { matchesDateSearch } from './dateSearch.js';
import {
  createEditorState,
  createPostenEditor,
  resolvePostenDetails,
} from './postenEditor.js';

const PDF_VORLAGE_VIEWS = ['pdf-vorlage-angebot', 'pdf-vorlage-rechnung'];
const DOC_KOPF_LABEL = () => t('common.generalInfo');

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
    kundeAnrede: '',
    kundeKundenNr: '',
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

function getDefaultViewForBereich(_bereich = state.bereich) {
  return 'dashboard';
}

const state = {
  appStarted: false,
  view: 'dashboard',
  lastNavBarView: 'dashboard',
  bereich: 'angebote',
  editingKundeId: null,
  detailKundeId: null,
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
  registerEmail: document.getElementById('register-email'),
  registerPass: document.getElementById('register-pass'),
  registerError: document.getElementById('register-error'),
  registerPlanNote: document.getElementById('register-plan-note'),
  authTitle: document.getElementById('auth-title'),
  logoutBtn: document.getElementById('logout-btn'),
  profileBtn: document.getElementById('profile-btn'),
  adminBtn: document.getElementById('admin-btn'),
  mainNav: document.getElementById('main-nav'),
  appSidebar: document.getElementById('app-sidebar'),
  appSidebarBackdrop: document.getElementById('app-sidebar-backdrop'),
  navMobileToggle: document.getElementById('nav-mobile-toggle'),
  sidebarCollapseBtn: document.getElementById('sidebar-collapse-btn'),
  bereichSwitcher: document.getElementById('bereich-switcher'),
  bereichSwitcherWrap: document.getElementById('bereich-switcher-wrap'),
  bereichSwitcherMenu: document.getElementById('bereich-switcher-menu'),
  bereichSwitcherMark: document.getElementById('bereich-switcher-mark'),
  bereichSwitcherLabel: document.getElementById('bereich-switcher-label'),
  viewRechnungNeu: document.getElementById('view-rechnung-neu'),
  viewRechnungArchiv: document.getElementById('view-rechnung-archiv'),
  viewDashboard: document.getElementById('view-dashboard'),
  dashboardRoot: document.getElementById('dashboard-root'),
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
  adminOverview: document.getElementById('admin-overview'),
  adminUserList: document.getElementById('admin-user-list'),
  adminImpersonationBanner: document.getElementById('admin-impersonation-banner'),
  adminImpersonationLabel: document.getElementById('admin-impersonation-label'),
  adminImpersonationStopBtn: document.getElementById('admin-impersonation-stop-btn'),
  adminImpersonationArchivBtn: document.getElementById('admin-impersonation-archiv-btn'),
  adminImpersonationRechnungenBtn: document.getElementById('admin-impersonation-rechnungen-btn'),
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
  profilAngebotNummerSchema: document.getElementById('profil-angebot-nummer-schema'),
  profilRechnungNummerSchema: document.getElementById('profil-rechnung-nummer-schema'),
  profilAngebotSchemaPreview: document.getElementById('profil-angebot-schema-preview'),
  profilRechnungSchemaPreview: document.getElementById('profil-rechnung-schema-preview'),
  profilDeleteAccountBtn: document.getElementById('profil-delete-account-btn'),
  profilDeleteModal: document.getElementById('profil-delete-modal'),
  profilDeletePlz: document.getElementById('profil-delete-plz'),
  profilDeleteStatus: document.getElementById('profil-delete-status'),
  profilDeleteConfirmBtn: document.getElementById('profil-delete-confirm'),
  archivSuche: document.getElementById('archiv-suche'),
  archivListe: document.getElementById('archiv-liste'),
  resetBtn: document.getElementById('reset-btn'),
  saveBtn: document.getElementById('save-btn'),
  pdfFooter: document.getElementById('pdf-footer'),
  angebotStickyFooter: document.getElementById('angebot-sticky-footer'),
  pdfBtn: document.getElementById('pdf-btn'),
  previewBtn: document.getElementById('preview-btn'),
  pdfSendHint: document.getElementById('pdf-send-hint'),
  postenListe: document.getElementById('posten-liste'),
  zusammenfassung: document.getElementById('zusammenfassung'),
  summeNetto: document.getElementById('summe-netto'),
  summeMwst: document.getElementById('summe-mwst'),
  summeBrutto: document.getElementById('summe-brutto'),
  suche: document.getElementById('suche'),
  kundeName: document.getElementById('kunde-name'),
  kundeAuswahlBtn: document.getElementById('kunde-auswahl-btn'),
  kundeSaveBtn: document.getElementById('kunde-save-btn'),
  kundeHinweis: document.getElementById('kunde-hinweis'),
  kundeStrasse: document.getElementById('kunde-strasse'),
  kundePlzOrt: document.getElementById('kunde-plz-ort'),
  kundeEmail: document.getElementById('kunde-email'),
  kundeTelefon: document.getElementById('kunde-telefon'),
  kundeAdresseAuswahl: document.getElementById('kunde-adresse-auswahl'),
  kundeEinsatzortHinweis: document.getElementById('kunde-einsatzort-hinweis'),
  kundenModal: document.getElementById('kunden-modal'),
  kundenPickerSuche: document.getElementById('kunden-picker-suche'),
  kundenPickerListe: document.getElementById('kunden-picker-liste'),
  kundenForm: document.getElementById('kunden-form'),
  kundenFormTitle: document.getElementById('kunden-form-title'),
  kundenFormReset: document.getElementById('kunden-form-reset'),
  kundenFormAnrede: document.getElementById('kunden-form-anrede'),
  kundenFormKundenNr: document.getElementById('kunden-form-kunden-nr'),
  kundenFormName: document.getElementById('kunden-form-name'),
  kundenFormStrasse: document.getElementById('kunden-form-strasse'),
  kundenFormPlzOrt: document.getElementById('kunden-form-plz-ort'),
  kundenFormTelefon: document.getElementById('kunden-form-telefon'),
  kundenFormEmail: document.getElementById('kunden-form-email'),
  kundenFormNotiz: document.getElementById('kunden-form-notiz'),
  kundenFormSection: document.getElementById('kunden-form-section'),
  kundenDetail: document.getElementById('kunden-detail'),
  kundenDetailTitle: document.getElementById('kunden-detail-title'),
  kundenDetailKundenNr: document.getElementById('kunden-detail-kunden-nr'),
  kundenDetailAnrede: document.getElementById('kunden-detail-anrede'),
  kundenDetailAdresse: document.getElementById('kunden-detail-adresse'),
  kundenDetailTelefon: document.getElementById('kunden-detail-telefon'),
  kundenDetailEmail: document.getElementById('kunden-detail-email'),
  kundenDetailNotizWrap: document.getElementById('kunden-detail-notiz-wrap'),
  kundenDetailNotiz: document.getElementById('kunden-detail-notiz'),
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
  katalogFormArt: document.getElementById('katalog-form-art'),
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
  rechnungSaveBtn: document.getElementById('rechnung-save-btn'),
  rechnungStickyFooter: document.getElementById('rechnung-sticky-footer'),
  rechnungPdfBtn: document.getElementById('rechnung-pdf-btn'),
  rechnungPreviewBtn: document.getElementById('rechnung-preview-btn'),
  rechnungPdfSendHint: document.getElementById('rechnung-pdf-send-hint'),
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
  rechnungKundeSaveBtn: document.getElementById('rechnung-kunde-save-btn'),
  rechnungKundeHinweis: document.getElementById('rechnung-kunde-hinweis'),
  rechnungKundeStrasse: document.getElementById('rechnung-kunde-strasse'),
  rechnungKundePlzOrt: document.getElementById('rechnung-kunde-plz-ort'),
  rechnungKundeEmail: document.getElementById('rechnung-kunde-email'),
  rechnungKundeTelefon: document.getElementById('rechnung-kunde-telefon'),
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
  documentPreviewModal: document.getElementById('document-preview-modal'),
  documentPreviewViewport: document.querySelector('.document-preview-modal__viewport'),
  documentPreviewContent: document.getElementById('document-preview-content'),
  documentPreviewSendBtn: document.getElementById('document-preview-send-btn'),
};

const angebotPostenEditor = createPostenEditor(angebotPostenState, {
  postenListe: els.postenListe,
  suche: els.suche,
  zusammenfassung: els.zusammenfassung,
  summeNetto: els.summeNetto,
  summeMwst: els.summeMwst,
  summeBrutto: els.summeBrutto,
  pdfBtn: els.pdfBtn,
  previewBtn: els.previewBtn,
  saveBtn: els.saveBtn,
  canSave: () => isAngebotKopfComplete(),
  onKatalogSaved: refreshPostenEditors,
  onUpdate: () => {
    updatePostenKopfSummary();
    updatePageHeader();
  },
});

const rechnungPostenEditor = createPostenEditor(rechnungPostenState, {
  postenListe: els.rechnungPostenListe,
  suche: els.rechnungSuche,
  summeNetto: els.rechnungSummeNetto,
  summeMwst: els.rechnungSummeMwst,
  summeBrutto: els.rechnungSummeBrutto,
  pdfBtn: els.rechnungPdfBtn,
  previewBtn: els.rechnungPreviewBtn,
  saveBtn: els.rechnungSaveBtn,
  canSave: () => isRechnungKopfComplete(),
  onKatalogSaved: refreshPostenEditors,
  onUpdate: () => {
    updateRechnungPostenKopfSummary();
    updateRechnungPageHeader();
  },
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

function normalizeKundeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function findKundeByNameAndEmail(kunden, name, email) {
  const normName = normalizeKundeName(name);
  const normEmail = normalizeKundeEmail(email);
  if (!normName || !normEmail) return null;
  return (
    kunden.find(
      (k) => normalizeKundeName(k.name) === normName && normalizeKundeEmail(k.email) === normEmail
    ) || null
  );
}

function setKundeSaveButtonEnabled(btn, enabled) {
  if (!btn) return;
  btn.disabled = !enabled;
  btn.setAttribute('aria-disabled', String(!enabled));
  btn.classList.toggle('is-disabled', !enabled);
}

function isDocumentKundeEmailValid(email) {
  return (email || '').trim().includes('@');
}

function updateKundeSaveButtonState(scope = 'angebot') {
  const isRechnung = scope === 'rechnung';
  const nameEl = isRechnung ? els.rechnungKundeName : els.kundeName;
  const emailEl = isRechnung ? els.rechnungKundeEmail : els.kundeEmail;
  const saveBtn = isRechnung ? els.rechnungKundeSaveBtn : els.kundeSaveBtn;
  const canSave = !!(nameEl?.value.trim() && isDocumentKundeEmailValid(emailEl?.value));
  setKundeSaveButtonEnabled(saveBtn, canSave);
}

function updateAllKundeSaveButtonStates() {
  updateKundeSaveButtonState('angebot');
  updateKundeSaveButtonState('rechnung');
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
    (k.kundenNr || '').toLowerCase().includes(q) ||
    (k.anrede || '').toLowerCase().includes(q) ||
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

function getObjektTypLabel(typ) {
  if (typ === 'rechnung') return t('objektType.billing');
  return t('objektType.service');
}

function clearObjektMeta(meta) {
  meta.selectedObjektId = null;
  meta.selectedAdresseKey = null;
  meta.objekt = null;
  meta.objekteCache = [];
  meta.billingAdresse = '';
  meta.billingSnapshot = null;
  meta.kundeAnrede = '';
  meta.kundeKundenNr = '';
}

function setBillingSnapshot(meta, adresseLike) {
  meta.billingSnapshot = normalizeAdresse(adresseLike);
  meta.billingAdresse = meta.billingSnapshot.adresse;
}

function updateEinsatzortHinweis(hinweisEl, meta) {
  if (!hinweisEl) return;
  if (meta.objekt?.typ === 'einsatz' && meta.objekt.name) {
    hinweisEl.textContent = t('common.serviceLocation', { name: meta.objekt.name });
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
    const badge = getObjektTypLabel(obj.typ);
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

function buildKundePayload(name, adresseData, meta, email = '', telefon = '') {
  const addr = normalizeAdresse(adresseData);
  const kunde = {
    name,
    strasse: addr.strasse,
    plzOrt: addr.plzOrt,
    adresse: addr.adresse,
  };
  const trimmedEmail = String(email || adresseData?.email || '').trim();
  const trimmedTelefon = String(telefon || adresseData?.telefon || '').trim();
  if (trimmedEmail) kunde.email = trimmedEmail;
  if (trimmedTelefon) kunde.telefon = trimmedTelefon;
  const anrede = normalizeKundeAnrede(meta.kundeAnrede);
  if (anrede) kunde.anrede = anrede;
  if (meta.kundeKundenNr) kunde.kundenNr = meta.kundeKundenNr;
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

async function resolveKundeIdForSave(name, adresseData, selectedKundeId) {
  const trimmedName = (name || '').trim();
  const addr = normalizeAdresse(adresseData);
  const email = String(adresseData?.email || '').trim();
  const telefon = String(adresseData?.telefon || '').trim();

  if (!trimmedName) {
    return {
      kundeId: null,
      kunde: {
        name: '',
        email,
        telefon,
        strasse: addr.strasse,
        plzOrt: addr.plzOrt,
        adresse: addr.adresse,
      },
    };
  }

  const jetzt = new Date().toISOString();
  const kunden = await getAllKunden();
  const kundeSnapshot = {
    name: trimmedName,
    email,
    telefon,
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
      (next.email || '') !== (kunde.email || '') ||
      (next.telefon || '') !== (kunde.telefon || '') ||
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
        email,
        telefon,
        strasse: addr.strasse || normalizeAdresse(selectedKunde).strasse,
        plzOrt: addr.plzOrt || normalizeAdresse(selectedKunde).plzOrt,
      });
      const normalized = normalizeAdresse(updated);
      return {
        kundeId: selectedKunde.id,
        kunde: {
          anrede: normalizeKundeAnrede(updated.anrede),
          kundenNr: updated.kundenNr || '',
          email: updated.email || '',
          telefon: updated.telefon || '',
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
      email,
      telefon,
      strasse: addr.strasse || prev.strasse,
      plzOrt: addr.plzOrt || prev.plzOrt,
    });
    const normalized = normalizeAdresse(updated);
    return {
      kundeId: byName.id,
      kunde: {
        anrede: normalizeKundeAnrede(updated.anrede),
        kundenNr: updated.kundenNr || '',
        email: updated.email || '',
        telefon: updated.telefon || '',
        name: updated.name,
        strasse: normalized.strasse,
        plzOrt: normalized.plzOrt,
        adresse: normalized.adresse,
      },
    };
  }

  const kundenNr = await generiereKundennummer(getAllKunden);
  const neu = {
    id: createKundeId(),
    kundenNr,
    anrede: '',
    name: trimmedName,
    email,
    telefon,
    strasse: addr.strasse,
    plzOrt: addr.plzOrt,
    adresse: addr.adresse,
    erstelltAm: jetzt,
    aktualisiertAm: jetzt,
  };
  await saveKunde(neu);
  return {
    kundeId: neu.id,
    kunde: {
      ...kundeSnapshot,
      kundenNr,
    },
  };
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
      state.angebot,
      els.kundeEmail?.value.trim(),
      els.kundeTelefon?.value.trim()
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
      state.rechnung,
      els.rechnungKundeEmail?.value.trim(),
      els.rechnungKundeTelefon?.value.trim()
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
    els.rechnungAngebotRef.textContent = t('invoice.fromOffer', { nr: state.rechnung.angebotNr });
    els.rechnungAngebotRef.classList.remove('hidden');
  } else {
    els.rechnungAngebotRef.textContent = '';
    els.rechnungAngebotRef.classList.add('hidden');
  }
}

async function setupAngebotKundeAdressen(kunde) {
  const addr = normalizeAdresse(kunde);
  state.angebot.selectedKundeId = kunde.id;
  state.angebot.kundeAnrede = normalizeKundeAnrede(kunde.anrede);
  state.angebot.kundeKundenNr = kunde.kundenNr || '';
  setBillingSnapshot(state.angebot, addr);
  els.kundeName.value = kunde.name;
  if (els.kundeEmail) els.kundeEmail.value = kunde.email || '';
  if (els.kundeTelefon) els.kundeTelefon.value = kunde.telefon || '';
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
  updateKundeSaveButtonState('angebot');
}

async function setupRechnungKundeAdressen(kunde) {
  const addr = normalizeAdresse(kunde);
  state.rechnung.selectedKundeId = kunde.id;
  state.rechnung.kundeAnrede = normalizeKundeAnrede(kunde.anrede);
  state.rechnung.kundeKundenNr = kunde.kundenNr || '';
  setBillingSnapshot(state.rechnung, addr);
  els.rechnungKundeName.value = kunde.name;
  if (els.rechnungKundeEmail) els.rechnungKundeEmail.value = kunde.email || '';
  if (els.rechnungKundeTelefon) els.rechnungKundeTelefon.value = kunde.telefon || '';
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
  updateKundeSaveButtonState('rechnung');
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

async function saveDocumentKundeFromForm(scope) {
  const isRechnung = scope === 'rechnung';
  const nameEl = isRechnung ? els.rechnungKundeName : els.kundeName;
  const emailEl = isRechnung ? els.rechnungKundeEmail : els.kundeEmail;
  const telefonEl = isRechnung ? els.rechnungKundeTelefon : els.kundeTelefon;
  const strasseEl = isRechnung ? els.rechnungKundeStrasse : els.kundeStrasse;
  const plzOrtEl = isRechnung ? els.rechnungKundePlzOrt : els.kundePlzOrt;
  const saveBtn = isRechnung ? els.rechnungKundeSaveBtn : els.kundeSaveBtn;

  const name = nameEl?.value.trim() || '';
  const email = emailEl?.value.trim() || '';
  if (!name || !isDocumentKundeEmailValid(email)) return;

  setKundeSaveButtonEnabled(saveBtn, false);

  try {
    const kunden = await getAllKunden();
    const existing = findKundeByNameAndEmail(kunden, name, email);
    if (existing) {
      alert(t('form.customerExists'));
      if (isRechnung) {
        await setupRechnungKundeAdressen(existing);
        updateRechnungKundeHinweis();
        updateRechnungKopfSummary();
        updateRechnungPageHeader();
      } else {
        await setupAngebotKundeAdressen(existing);
        updateKundeHinweis();
        updateAngebotKopfSummary();
        updatePageHeader();
      }
      return;
    }

    const jetzt = new Date().toISOString();
    const formAdresse = readAdresseFieldPair(strasseEl, plzOrtEl);
    const kundenNr = await generiereKundennummer(getAllKunden);
    const neu = {
      id: createKundeId(),
      kundenNr,
      anrede: '',
      name,
      email,
      telefon: telefonEl?.value.trim() || '',
      strasse: formAdresse.strasse,
      plzOrt: formAdresse.plzOrt,
      adresse: formAdresse.adresse,
      erstelltAm: jetzt,
      aktualisiertAm: jetzt,
    };

    await saveKunde(neu);

    if (isRechnung) {
      await setupRechnungKundeAdressen(neu);
      updateRechnungKundeHinweis();
      updateRechnungKopfSummary();
      updateRechnungPageHeader();
    } else {
      await setupAngebotKundeAdressen(neu);
      updateKundeHinweis();
      updateAngebotKopfSummary();
      updatePageHeader();
    }
  } catch (err) {
    alert(`Speichern fehlgeschlagen: ${err.message}`);
  } finally {
    updateKundeSaveButtonState(scope);
  }
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
  updatePageHeader();
  updateKundeSaveButtonState('angebot');
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
  updateRechnungPageHeader();
  updateKundeSaveButtonState('rechnung');
}

async function resetForm() {
  state.angebot.editingId = null;
  setAngebotKopfCollapsed(isMobileLayout());
  angebotPostenEditor.clearPostenState();
  clearKundeAuswahl();
  els.kundeName.value = '';
  if (els.kundeEmail) els.kundeEmail.value = '';
  if (els.kundeTelefon) els.kundeTelefon.value = '';
  clearAdresseFieldPair(els.kundeStrasse, els.kundePlzOrt);
  els.angebotNr.value = await generiereAngebotsnummer();

  const heute = new Date();
  els.angebotDatum.value = heute.toISOString().split('T')[0];
  const gueltig = new Date(heute);
  gueltig.setDate(gueltig.getDate() + 30);
  els.gueltigBis.value = gueltig.toISOString().split('T')[0];

  updatePageHeader();
  angebotPostenEditor.render();
  updateKundeSaveButtonState('angebot');
}

async function resetRechnungForm() {
  state.rechnung = createRechnungMeta();
  setRechnungKopfCollapsed(isMobileLayout());
  rechnungPostenEditor.clearPostenState();
  els.rechnungKundeName.value = '';
  if (els.rechnungKundeEmail) els.rechnungKundeEmail.value = '';
  if (els.rechnungKundeTelefon) els.rechnungKundeTelefon.value = '';
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
  updateKundeSaveButtonState('rechnung');
}

async function loadAngebotIntoForm(angebot) {
  state.angebot.editingId = angebot.id;
  setAngebotKopfCollapsed(isMobileLayout());
  state.angebot.selectedKundeId = angebot.kundeId || null;
  state.angebot.kundeAnrede = normalizeKundeAnrede(angebot.kunde?.anrede);
  state.angebot.kundeKundenNr = angebot.kunde?.kundenNr || '';
  setBillingSnapshot(state.angebot, angebot.kunde);
  angebotPostenEditor.loadPostenFromDocument(angebot.posten);

  els.kundeName.value = angebot.kunde.name;
  if (els.kundeEmail) els.kundeEmail.value = angebot.kunde.email || '';
  if (els.kundeTelefon) els.kundeTelefon.value = angebot.kunde.telefon || '';
  setAdresseFieldPair(els.kundeStrasse, els.kundePlzOrt, angebot.kunde);
  els.angebotNr.value = angebot.angebotNr;
  els.angebotDatum.value =
    angebot.angebotsdatum || angebot.erstelltAm?.split('T')[0] || '';
  els.gueltigBis.value = angebot.gueltigBis;
  if (angebot.kundeId) {
    const stamm = await getKunde(angebot.kundeId);
    if (stamm) {
      setBillingSnapshot(state.angebot, stamm);
      state.angebot.kundeAnrede = normalizeKundeAnrede(stamm.anrede);
      state.angebot.kundeKundenNr = stamm.kundenNr || '';
    }
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
  state.rechnung.kundeAnrede = normalizeKundeAnrede(rechnung.kunde?.anrede);
  state.rechnung.kundeKundenNr = rechnung.kunde?.kundenNr || '';
  setBillingSnapshot(state.rechnung, rechnung.kunde);
  state.rechnung.angebotId = rechnung.angebotId || null;
  state.rechnung.angebotNr = rechnung.angebotNr || null;
  rechnungPostenEditor.loadPostenFromDocument(rechnung.posten);

  els.rechnungKundeName.value = rechnung.kunde.name;
  if (els.rechnungKundeEmail) els.rechnungKundeEmail.value = rechnung.kunde.email || '';
  if (els.rechnungKundeTelefon) els.rechnungKundeTelefon.value = rechnung.kunde.telefon || '';
  setAdresseFieldPair(els.rechnungKundeStrasse, els.rechnungKundePlzOrt, rechnung.kunde);
  els.rechnungNr.value = rechnung.rechnungNr;
  els.rechnungDatum.value = rechnung.rechnungsdatum || rechnung.erstelltAm?.split('T')[0] || '';
  els.rechnungFaellig.value = rechnung.faelligAm || '';
  if (rechnung.kundeId) {
    const stamm = await getKunde(rechnung.kundeId);
    if (stamm) {
      setBillingSnapshot(state.rechnung, stamm);
      state.rechnung.kundeAnrede = normalizeKundeAnrede(stamm.anrede);
      state.rechnung.kundeKundenNr = stamm.kundenNr || '';
    }
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
  state.rechnung.kundeAnrede = normalizeKundeAnrede(angebot.kunde?.anrede);
  state.rechnung.kundeKundenNr = angebot.kunde?.kundenNr || '';
  setBillingSnapshot(state.rechnung, angebot.kunde);
  rechnungPostenEditor.loadPostenFromDocument(angebot.posten);

  els.rechnungKundeName.value = angebot.kunde.name;
  if (els.rechnungKundeEmail) els.rechnungKundeEmail.value = angebot.kunde.email || '';
  if (els.rechnungKundeTelefon) els.rechnungKundeTelefon.value = angebot.kunde.telefon || '';
  setAdresseFieldPair(els.rechnungKundeStrasse, els.rechnungKundePlzOrt, angebot.kunde);
  if (angebot.kundeId) {
    const stamm = await getKunde(angebot.kundeId);
    if (stamm) {
      setBillingSnapshot(state.rechnung, stamm);
      state.rechnung.kundeAnrede = normalizeKundeAnrede(stamm.anrede);
      state.rechnung.kundeKundenNr = stamm.kundenNr || '';
    }
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

function setFooterButtonEnabled(btn, enabled) {
  if (!btn) return;
  btn.disabled = !enabled;
  btn.setAttribute('aria-disabled', String(!enabled));
  btn.classList.toggle('is-disabled', !enabled);
}

function angebotFormHasChanges() {
  if (state.angebot.editingId) return true;
  if (angebotPostenEditor.getAusgewaehltePosten().length > 0) return true;
  if (state.angebot.selectedKundeId) return true;
  if (els.kundeName?.value.trim()) return true;
  if (els.kundeEmail?.value.trim()) return true;
  if (els.kundeTelefon?.value.trim()) return true;
  if (els.kundeStrasse?.value.trim()) return true;
  if (els.kundePlzOrt?.value.trim()) return true;
  return false;
}

function rechnungFormHasChanges() {
  if (state.rechnung.editingId) return true;
  if (state.rechnung.angebotId) return true;
  if (rechnungPostenEditor.getAusgewaehltePosten().length > 0) return true;
  if (state.rechnung.selectedKundeId) return true;
  if (els.rechnungKundeName?.value.trim()) return true;
  if (els.rechnungKundeEmail?.value.trim()) return true;
  if (els.rechnungKundeTelefon?.value.trim()) return true;
  if (els.rechnungKundeStrasse?.value.trim()) return true;
  if (els.rechnungKundePlzOrt?.value.trim()) return true;
  return false;
}

function updatePageHeader() {
  setFooterButtonEnabled(els.resetBtn, angebotFormHasChanges());
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
  const refreshAngebotPdf = () => {
    angebotPostenEditor.refreshSummary();
    updatePageHeader();
    updateKundeSaveButtonState('angebot');
  };
  const refreshRechnungPdf = () => {
    rechnungPostenEditor.refreshSummary();
    updateRechnungPageHeader();
    updateKundeSaveButtonState('rechnung');
  };

  [
    els.angebotNr,
    els.angebotDatum,
    els.gueltigBis,
    els.kundeName,
    els.kundeEmail,
    els.kundeTelefon,
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
    els.rechnungKundeEmail,
    els.rechnungKundeTelefon,
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
  const summary = hasKundeData ? parts.join(' – ') : DOC_KOPF_LABEL();
  if (els.angebotKopfSummaryKunde) els.angebotKopfSummaryKunde.textContent = summary;
  els.angebotKopfSummaryMeta?.classList.toggle('is-empty', !hasKundeData);
}

function updateRechnungKopfSummary() {
  const name = els.rechnungKundeName?.value.trim() || '';
  const strasse = els.rechnungKundeStrasse?.value.trim() || '';
  const plzOrt = els.rechnungKundePlzOrt?.value.trim() || '';
  const parts = [name, strasse, plzOrt].filter(Boolean);
  const hasKundeData = parts.length > 0;
  const summary = hasKundeData ? parts.join(' – ') : DOC_KOPF_LABEL();
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
  if (count === 0) els.postenKopfSummaryCount.textContent = t('posten.none');
  else if (count === 1) els.postenKopfSummaryCount.textContent = t('posten.one');
  else els.postenKopfSummaryCount.textContent = t('posten.many', { count });
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
  if (count === 0) els.rechnungPostenKopfSummaryCount.textContent = t('posten.none');
  else if (count === 1) els.rechnungPostenKopfSummaryCount.textContent = t('posten.one');
  else els.rechnungPostenKopfSummaryCount.textContent = t('posten.many', { count });
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
  setFooterButtonEnabled(els.rechnungResetBtn, rechnungFormHasChanges());
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

function updateProfilSchemaPreviews(tpl = getPdfTemplate()) {
  const angebotSchema = tpl.angebot?.nummerSchema || '';
  const rechnungSchema = tpl.rechnung?.nummerSchema || '';

  if (els.profilAngebotNummerSchema) {
    els.profilAngebotNummerSchema.textContent = angebotSchema || '—';
  }
  if (els.profilRechnungNummerSchema) {
    els.profilRechnungNummerSchema.textContent = rechnungSchema || '—';
  }

  const updatePreview = (schema, preview, previewFn) => {
    if (!preview) return;
    if (!schema) {
      preview.textContent = '—';
      return;
    }
    try {
      preview.textContent = previewFn(schema, new Date(), 1);
    } catch {
      preview.textContent = t('form.invalidSchema');
    }
  };

  updatePreview(angebotSchema, els.profilAngebotSchemaPreview, previewAngebotsnummer);
  updatePreview(rechnungSchema, els.profilRechnungSchemaPreview, previewRechnungsnummer);
}

async function renderProfilView() {
  await refreshSession();
  const session = getSession();
  const tenant = session?.tenant;
  const user = session?.user;

  if (els.profilEmail) els.profilEmail.textContent = user?.email || '—';
  if (els.profilPlan) els.profilPlan.textContent = formatPlan(tenant?.plan);

  setProfilAccountStatus('');
  setProfilPasswordStatus('');
  els.profilPasswordForm?.reset();

  await loadPdfTemplate();
  fillProfileFirmaForm(els.profilAccountForm, getPdfTemplate(), session);
  updateProfilSchemaPreviews(getPdfTemplate());
  syncProfilNummernAccess();
  syncProfilPlanAccess();
}

function refreshPdfTemplatePreviewsFromProfile() {
  const angebotVariant = getPdfLayoutVariant('angebot');
  const rechnungVariant = getPdfLayoutVariant('rechnung');
  if (els.pdfAngebotForm && els.pdfPreviewAngebot) {
    updatePdfTemplatePreview(els.pdfAngebotForm, els.pdfPreviewAngebot, 'angebot', angebotVariant);
  }
  if (els.pdfRechnungForm && els.pdfPreviewRechnung) {
    updatePdfTemplatePreview(els.pdfRechnungForm, els.pdfPreviewRechnung, 'rechnung', rechnungVariant);
  }
}

function syncProfilPlanAccess() {
  const plan = getSession()?.tenant?.plan;
  const hideChange = plan === 'admin' || isImpersonating();
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
  els.profilDeleteAccountBtn?.classList.toggle(
    'hidden',
    getSession()?.tenant?.plan === 'admin' || isImpersonating()
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

function formatAdminPlan(plan) {
  return formatPlanLabel(plan);
}

function formatAdminYesNo(value) {
  return value ? 'Ja' : 'Nein';
}

function renderAdminOverview(overview) {
  if (!els.adminOverview) return;
  if (!overview) {
    els.adminOverview.innerHTML = '';
    return;
  }

  const cards = [
    { label: 'Nutzer', value: overview.users },
    { label: 'Mandanten', value: overview.tenants },
    { label: 'Angebote', value: overview.angebote },
    { label: 'Rechnungen', value: overview.rechnungen },
    { label: 'Kunden', value: overview.kunden },
    { label: 'Katalog-Posten', value: overview.katalogPosten },
  ];

  els.adminOverview.innerHTML = `
    <div class="admin-overview__grid">
      ${cards
        .map(
          (card) => `
        <article class="admin-overview__card">
          <p class="admin-overview__label">${escapeHtml(card.label)}</p>
          <p class="admin-overview__value">${escapeHtml(String(card.value ?? 0))}</p>
        </article>`
        )
        .join('')}
    </div>
  `;
}

function renderAdminDocumentList(title, documents, emptyText) {
  if (!documents?.length) {
    return `
      <div class="admin-user-detail__section">
        <h4>${escapeHtml(title)}</h4>
        <p class="admin-user-detail__empty">${escapeHtml(emptyText)}</p>
      </div>
    `;
  }

  return `
    <div class="admin-user-detail__section">
      <h4>${escapeHtml(title)}</h4>
      <ul class="admin-user-detail__docs">
        ${documents
          .map(
            (doc) => `
          <li>
            <span class="admin-user-detail__doc-nr">${escapeHtml(doc.number || '—')}</span>
            <span class="admin-user-detail__doc-meta">
              ${escapeHtml(doc.customer || 'Ohne Kunde')}
              · ${escapeHtml(formatDatum(doc.date))}
            </span>
          </li>`
          )
          .join('')}
      </ul>
    </div>
  `;
}

async function loadAdminUserDetail(tenantId, container) {
  if (!container) return;
  container.innerHTML = '<p class="admin-user-detail__loading">Lade Dokumente…</p>';
  try {
    const data = await loadAdminTenantDocuments(tenantId);
    container.innerHTML = `
      <div class="admin-user-detail">
        <p class="admin-user-detail__lead">
          ${escapeHtml(data.tenant?.name || 'Mandant')}
          · ${escapeHtml(formatAdminPlan(data.tenant?.plan))}
          · ${escapeHtml(data.tenant?.ownerEmail || '—')}
        </p>
        ${renderAdminDocumentList(
          `Angebote (${data.totals?.angebote ?? 0})`,
          data.angebote,
          'Noch keine Angebote.'
        )}
        ${renderAdminDocumentList(
          `Rechnungen (${data.totals?.rechnungen ?? 0})`,
          data.rechnungen,
          'Noch keine Rechnungen.'
        )}
        <div class="admin-user-detail__actions">
          <button type="button" class="btn btn-primary btn-sm" data-admin-open-tenant="${escapeHtml(tenantId)}">
            Account öffnen
          </button>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p class="admin-user-detail__empty">Fehler: ${escapeHtml(err.message)}</p>`;
  }
}

async function openAdminTenant(tenantId, targetView = 'archiv') {
  if (!tenantId || !isAdmin()) return;
  try {
    await startAdminImpersonation(tenantId);
    await refreshSession();
    await reloadAfterTenantSwitch();
    if (targetView === 'rechnung-archiv') {
      state.bereich = 'rechnungen';
      syncBereichSwitcher();
      syncBereichNav();
      showView('rechnung-archiv');
    } else {
      state.bereich = 'angebote';
      syncBereichSwitcher();
      syncBereichNav();
      showView('archiv');
    }
  } catch (err) {
    alert(err.message || 'Account konnte nicht geöffnet werden.');
  }
}

async function stopAdminImpersonationFlow() {
  if (!isImpersonating()) return;
  try {
    await stopAdminImpersonation();
    await refreshSession();
    await reloadAfterTenantSwitch();
    showView('admin');
  } catch (err) {
    alert(err.message || 'Admin-Modus konnte nicht beendet werden.');
  }
}

async function reloadAfterTenantSwitch() {
  await loadPdfTemplate();
  await loadKatalogPosten();
  await resetForm();
  await resetRechnungForm();
  syncProfileButton();
  syncImpersonationBanner();
  if (state.view === 'archiv') await renderArchiv();
  else if (state.view === 'rechnung-archiv') await renderRechnungArchiv();
  else if (state.view === 'kunden') await renderKundenView();
  else if (state.view === 'katalog') await renderKatalogView();
  else if (state.view === 'admin') await renderAdminView();
  else if (state.view === 'profil') await renderProfilView();
  else if (state.view === 'dashboard') await renderDashboardView();
}

function syncImpersonationBanner() {
  const impersonation = getImpersonation();
  const active = Boolean(impersonation?.tenantId);
  els.adminImpersonationBanner?.classList.toggle('hidden', !active);
  if (!active || !els.adminImpersonationLabel) return;

  const tenantName = impersonation.tenantName || 'Unbekannt';
  const ownerEmail = impersonation.ownerEmail || '—';
  els.adminImpersonationLabel.textContent = `Sie sehen ${tenantName} (${ownerEmail}).`;
}

async function renderAdminView() {
  if (!els.adminUserList) return;
  if (!isAdmin()) {
    els.adminOverview && (els.adminOverview.innerHTML = '');
    els.adminUserList.innerHTML = '<p class="empty">Keine Berechtigung.</p>';
    return;
  }

  els.adminUserList.innerHTML = '<p class="empty">Lade Nutzer…</p>';
  renderAdminOverview(null);

  try {
    const data = await loadAdminUsers();
    const users = data?.users || [];
    renderAdminOverview(data?.overview);

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
              <th scope="col">Onboarding</th>
              <th scope="col">Kunden</th>
              <th scope="col">Angebote</th>
              <th scope="col">Rechnungen</th>
              <th scope="col">Katalog</th>
              <th scope="col">Letzte Aktivität</th>
              <th scope="col">Registriert</th>
              <th scope="col">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map((user) => {
                const stats = user.tenant?.stats || {};
                const isSystemAdmin = user.tenant?.plan === 'admin';
                return `
              <tr data-admin-user-row="${escapeHtml(user.tenant?.id || '')}">
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.tenant?.name || '—')}</td>
                <td><span class="admin-user-role admin-user-role--${escapeHtml(user.role || 'owner')}">${escapeHtml(formatUserRole(user.role))}</span></td>
                <td>${escapeHtml(formatAdminPlan(user.tenant?.plan))}</td>
                <td>${escapeHtml(formatAdminYesNo(user.tenant?.onboardingCompleted))}</td>
                <td>${escapeHtml(String(stats.kunden ?? 0))}</td>
                <td>${escapeHtml(String(stats.angebote ?? 0))}</td>
                <td>${escapeHtml(String(stats.rechnungen ?? 0))}</td>
                <td>${escapeHtml(String(stats.katalog ?? 0))}</td>
                <td>${escapeHtml(formatAdminDate(stats.lastActivityAt))}</td>
                <td>${escapeHtml(formatAdminDate(user.createdAt))}</td>
                <td class="admin-user-table__actions">
                  ${
                    isSystemAdmin
                      ? '<span class="admin-user-table__muted">—</span>'
                      : `
                    <button type="button" class="btn btn-ghost btn-sm" data-admin-toggle-detail="${escapeHtml(user.tenant?.id || '')}">
                      Details
                    </button>
                    <button type="button" class="btn btn-primary btn-sm" data-admin-open-tenant="${escapeHtml(user.tenant?.id || '')}">
                      Öffnen
                    </button>`
                  }
                </td>
              </tr>
              <tr class="admin-user-detail-row hidden" data-admin-detail-row="${escapeHtml(user.tenant?.id || '')}">
                <td colspan="12">
                  <div class="admin-user-detail-host" data-admin-detail-host="${escapeHtml(user.tenant?.id || '')}"></div>
                </td>
              </tr>`;
              })
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
  const impersonation = getImpersonation();
  const labelParts = [user, tenant?.name].filter(Boolean);
  if (impersonation?.tenantName) {
    labelParts.push(`Admin: ${impersonation.tenantName}`);
  }
  const label = labelParts.length ? `Profil (${labelParts.join(' · ')})` : 'Profil';
  els.profileBtn.setAttribute('aria-label', label);
  els.profileBtn.title = label;
  els.profileBtn.classList.toggle('is-current', view === 'profil');
  els.adminBtn?.classList.toggle('is-current', view === 'admin');
}

function syncAdminNav() {
  document.querySelectorAll('.is-admin-only').forEach((el) => {
    el.classList.toggle('hidden', !isAdmin());
  });
}

const NAV_VIEW_GROUPS = {
  dashboard: 'dashboard',
  neu: 'angebote',
  archiv: 'angebote',
  'rechnung-neu': 'rechnungen',
  'rechnung-archiv': 'rechnungen',
  kunden: 'stammdaten',
  katalog: 'stammdaten',
  'pdf-vorlage': 'einstellungen',
  'pdf-vorlage-angebot': 'einstellungen',
  'pdf-vorlage-rechnung': 'einstellungen',
};

const SIDEBAR_COLLAPSED_KEY = 'klemdesk.sidebarCollapsed';

function isDesktopSidebarLayout() {
  return window.matchMedia('(min-width: 921px)').matches;
}

function isSidebarCollapsed() {
  return els.appSidebar?.classList.contains('is-collapsed') ?? false;
}

function closeNavFlyouts() {
  document.querySelectorAll('.app-nav__group.is-flyout-open').forEach((group) => {
    group.classList.remove('is-flyout-open');
    const menu = group.querySelector('.app-nav__menu');
    if (menu) {
      menu.style.top = '';
      menu.style.left = '';
    }
  });
}

function positionNavFlyout(group) {
  const trigger = group?.querySelector('[data-nav-trigger]');
  const menu = group?.querySelector('.app-nav__menu');
  if (!trigger || !menu) return;
  const rect = trigger.getBoundingClientRect();
  menu.style.top = `${Math.max(8, rect.top)}px`;
  menu.style.left = `${rect.right + 8}px`;
}

function resetBereichDropdownPosition() {
  const menu = els.bereichSwitcherMenu;
  if (!menu) return;
  menu.style.position = '';
  menu.style.top = '';
  menu.style.left = '';
  menu.style.right = '';
  menu.style.width = '';
}

function positionBereichDropdown() {
  if (!isSidebarCollapsed() || !isDesktopSidebarLayout()) {
    resetBereichDropdownPosition();
    return;
  }
  const trigger = els.bereichSwitcher;
  const menu = els.bereichSwitcherMenu;
  if (!trigger || !menu) return;
  const rect = trigger.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = `${Math.max(8, rect.top)}px`;
  menu.style.left = `${rect.right + 8}px`;
  menu.style.right = 'auto';
  menu.style.width = '240px';
}

function syncSidebarCollapseUi() {
  if (!els.sidebarCollapseBtn) return;
  const collapsed = isSidebarCollapsed();
  els.sidebarCollapseBtn.setAttribute('aria-expanded', String(!collapsed));
  const labelKey = collapsed ? 'nav.sidebarExpand' : 'nav.sidebarCollapse';
  const label = t(labelKey);
  els.sidebarCollapseBtn.setAttribute('aria-label', label);
  els.sidebarCollapseBtn.setAttribute('title', label);
}

function setSidebarCollapsed(collapsed, { persist = true } = {}) {
  if (!els.appSidebar) return;

  if (persist) {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  }

  if (!isDesktopSidebarLayout()) {
    els.appSidebar.classList.remove('is-collapsed');
    els.app?.classList.remove('app--sidebar-collapsed');
    closeNavFlyouts();
    resetBereichDropdownPosition();
    syncSidebarCollapseUi();
    return;
  }

  els.appSidebar.classList.toggle('is-collapsed', collapsed);
  els.app?.classList.toggle('app--sidebar-collapsed', collapsed);
  if (collapsed) {
    closeNavFlyouts();
    closeBereichDropdown();
  } else {
    closeNavFlyouts();
    resetBereichDropdownPosition();
    expandVisibleNavGroups();
  }
  syncSidebarCollapseUi();
}

function toggleSidebarCollapsed() {
  setSidebarCollapsed(!isSidebarCollapsed());
}

function initSidebarCollapsed() {
  const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  setSidebarCollapsed(saved && isDesktopSidebarLayout(), { persist: false });
}

function closeMobileNav() {
  if (!els.appSidebar || !els.navMobileToggle) return;
  els.appSidebar.classList.remove('is-mobile-open');
  els.appSidebarBackdrop?.classList.add('hidden');
  els.appSidebarBackdrop?.setAttribute('aria-hidden', 'true');
  els.navMobileToggle.setAttribute('aria-expanded', 'false');
  els.navMobileToggle.setAttribute('aria-label', 'Menü öffnen');
}

function resolveNavBarView(view) {
  const resolved = resolvePdfVorlageView(view);
  if (resolved === 'profil' || resolved === 'admin') {
    return state.lastNavBarView ?? 'dashboard';
  }
  if (resolved === 'dashboard') {
    return 'dashboard';
  }
  if (
    resolved === 'neu' ||
    resolved === 'archiv' ||
    resolved === 'katalog' ||
    resolved === 'kunden' ||
    resolved === 'rechnung-neu' ||
    resolved === 'rechnung-archiv' ||
    isPdfVorlageView(resolved)
  ) {
    return resolved;
  }
  return 'dashboard';
}

let navIndicatorEl = null;
let navIndicatorReady = false;

function ensureNavIndicator() {}

function syncNavIndicator() {}

function syncNavState(view) {
  const resolved = resolvePdfVorlageView(view);
  const navView = resolveNavBarView(view);

  if (resolved !== 'profil' && resolved !== 'admin') {
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
    const isActive = NAV_VIEW_GROUPS[navView] === groupId;
    group.classList.toggle('is-active', isActive);
    if (isActive) {
      group.classList.add('is-open');
      const trigger = group.querySelector('[data-nav-trigger]');
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
    }
  });
}

function expandVisibleNavGroups() {
  document.querySelectorAll('.app-nav__group:not(.is-bereich-hidden)').forEach((group) => {
    group.classList.add('is-open');
    const trigger = group.querySelector('[data-nav-trigger]');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  });
}

function toggleNavGroup(group, forceOpen) {
  if (!group) return;

  if (isSidebarCollapsed() && isDesktopSidebarLayout()) {
    const isFlyoutOpen = group.classList.contains('is-flyout-open');
    const shouldOpen = forceOpen ?? !isFlyoutOpen;
    closeNavFlyouts();
    if (shouldOpen) {
      group.classList.add('is-flyout-open');
      positionNavFlyout(group);
      const trigger = group.querySelector('[data-nav-trigger]');
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
    } else {
      const trigger = group.querySelector('[data-nav-trigger]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
    return;
  }

  const isOpen = group.classList.contains('is-open');
  const shouldOpen = forceOpen ?? !isOpen;
  group.classList.toggle('is-open', shouldOpen);
  const trigger = group.querySelector('[data-nav-trigger]');
  if (trigger) trigger.setAttribute('aria-expanded', String(shouldOpen));
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
    bereichSwitcherMark.textContent = getBereichMark('rechnungen');
    bereichSwitcherMark.className = 'app-brand__mark app-brand__mark--rechnungen';
    bereichSwitcherLabel.textContent = t('bereich.invoices');
  } else {
    bereichSwitcherMark.textContent = getBereichMark('angebote');
    bereichSwitcherMark.className = 'app-brand__mark app-brand__mark--angebote';
    bereichSwitcherLabel.textContent = t('bereich.offers');
  }

  syncBereichMarks();

  els.bereichSwitcherMenu?.querySelectorAll('[data-bereich]').forEach((btn) => {
    const alternate = state.bereich === 'rechnungen' ? 'angebote' : 'rechnungen';
    btn.hidden = btn.dataset.bereich !== alternate;
  });

  els.app?.classList.toggle('app--rechnungen', state.bereich === 'rechnungen');
}

function openBereichDropdown() {
  if (!els.bereichSwitcherMenu || !els.bereichSwitcherWrap) return;
  syncBereichSwitcher();
  els.bereichSwitcherMenu.classList.remove('hidden');
  els.bereichSwitcherWrap.classList.add('is-open');
  els.bereichSwitcher?.setAttribute('aria-expanded', 'true');
  positionBereichDropdown();
}

function closeBereichDropdown() {
  if (!els.bereichSwitcherMenu || !els.bereichSwitcherWrap) return;
  els.bereichSwitcherMenu.classList.add('hidden');
  els.bereichSwitcherWrap.classList.remove('is-open');
  els.bereichSwitcher?.setAttribute('aria-expanded', 'false');
  resetBereichDropdownPosition();
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
    const nextView = viewAfter ?? getDefaultViewForBereich(bereich);
    showView(nextView);
    return;
  }

  els.viewRechnungNeu?.classList.add('hidden');
  els.viewRechnungArchiv?.classList.add('hidden');
  const nextView = viewAfter ?? getDefaultViewForBereich(bereich);
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
    setBereich(next, 'dashboard');
  };

  els.bereichSwitcherMenu?.querySelectorAll('[data-bereich]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activateBereich(btn.dataset.bereich);
    });
  });
}

function bindMainNav() {
  if (!els.mainNav) return;

  expandVisibleNavGroups();
  bindBereichSwitch();
  initSidebarCollapsed();

  els.sidebarCollapseBtn?.addEventListener('click', () => {
    toggleSidebarCollapsed();
  });

  els.navMobileToggle?.addEventListener('click', () => {
    const open = els.appSidebar.classList.toggle('is-mobile-open');
    els.navMobileToggle.setAttribute('aria-expanded', String(open));
    els.navMobileToggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    els.appSidebarBackdrop?.classList.toggle('hidden', !open);
    els.appSidebarBackdrop?.setAttribute('aria-hidden', String(!open));
  });

  els.appSidebarBackdrop?.addEventListener('click', closeMobileNav);

  els.mainNav.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-nav-trigger]');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      toggleNavGroup(trigger.closest('.app-nav__group'));
      return;
    }

    const link = e.target.closest('[data-nav-view]');
    const inMenu = link?.closest('.app-nav__menu');
    const directTrigger =
      link?.classList.contains('app-nav__trigger') && link.dataset.navView;
    if (link?.dataset.navView && (inMenu || directTrigger)) {
      if (link.dataset.navView === 'kunden' && !state.editingKundeId) {
        closeKundenForm();
      }
      showView(link.dataset.navView);
      closeNavFlyouts();
      closeMobileNav();
    }
  });

  window.addEventListener('resize', () => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    if (!isDesktopSidebarLayout()) {
      els.appSidebar?.classList.remove('is-collapsed');
      els.app?.classList.remove('app--sidebar-collapsed');
      closeNavFlyouts();
      resetBereichDropdownPosition();
      syncSidebarCollapseUi();
      return;
    }
    els.appSidebar?.classList.toggle('is-collapsed', saved);
    els.app?.classList.toggle('app--sidebar-collapsed', saved);
    syncSidebarCollapseUi();
    document.querySelectorAll('.app-nav__group.is-flyout-open').forEach(positionNavFlyout);
    if (els.bereichSwitcherWrap?.classList.contains('is-open')) {
      positionBereichDropdown();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.bereich-switcher')) {
      closeBereichDropdown();
    }
    if (
      !e.target.closest('.app-nav__group.is-flyout-open') &&
      !e.target.closest('[data-nav-trigger]')
    ) {
      closeNavFlyouts();
    }
    if (
      !e.target.closest('.app-sidebar') &&
      !e.target.closest('.app-nav-toggle') &&
      !e.target.closest('.app-sidebar-backdrop')
    ) {
      closeMobileNav();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeBereichDropdown();
      closeNavFlyouts();
      closeMobileNav();
    }
  });
}

async function renderDashboardView() {
  if (!els.dashboardRoot) return;
  els.dashboardRoot.innerHTML = `<p class="settings-lead">${escapeHtml(t('common.loading'))}</p>`;
  try {
    const [data, mailStatus] = await Promise.all([
      loadDashboardData(),
      fetchMailStatus().catch(() => null),
    ]);
    renderDashboard(els.dashboardRoot, data, { onNavigate: navigateFromDashboard, mailStatus });
  } catch (err) {
    els.dashboardRoot.innerHTML = `<p class="settings-status settings-status--error">${escapeHtml(err.message || t('dashboard.loadError'))}</p>`;
  }
}

function navigateFromDashboard(view) {
  if ((view === 'rechnung-neu' || view === 'rechnung-archiv') && state.bereich !== 'rechnungen') {
    setBereich('rechnungen', view);
    return;
  }
  if ((view === 'neu' || view === 'archiv') && state.bereich !== 'angebote') {
    setBereich('angebote', view);
    return;
  }
  showView(view);
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
    els.viewDashboard?.classList.toggle('hidden', view !== 'dashboard');
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
    } else if (view === 'dashboard') {
      void renderDashboardView();
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
  els.viewDashboard?.classList.toggle('hidden', view !== 'dashboard');
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
  } else if (view === 'dashboard') {
    els.angebotStickyFooter.classList.add('hidden');
    void renderDashboardView();
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
  previewRoot.querySelectorAll('.pdf-layout-preview__label').forEach((label) => {
    label.classList.toggle('is-active', regions.includes(label.dataset.region));
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
    el.addEventListener('mouseenter', () => {
      setPdfTemplatePreviewHighlight(previewRoot, resolvePdfPreviewHighlightRegions(el.dataset.region));
    });
    el.addEventListener('mouseleave', () => {
      window.setTimeout(() => {
        if (!form.contains(document.activeElement)) {
          setPdfTemplatePreviewHighlight(previewRoot, []);
        }
      }, 0);
    });
  });
}

function bindPdfTemplatePreviewRegionLabels(form, previewRoot) {
  if (!form || !previewRoot) return;
  bindPdfPreviewRegionLabels(previewRoot, {
    onHover: (region) => {
      setPdfTemplatePreviewHighlight(previewRoot, resolvePdfPreviewHighlightRegions(region));
    },
    onLeave: () => {
      window.setTimeout(() => {
        if (!form.contains(document.activeElement)) {
          setPdfTemplatePreviewHighlight(previewRoot, []);
        }
      }, 0);
    },
    onClick: (region) => openPdfTemplateSectionsFromPreview(form, previewRoot, region),
    isClickable: (region) => resolvePdfPreviewSections(region).length > 0,
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
    !previewRoot.querySelector('.pdf-layout-preview__labels--right') ||
    previewRoot.dataset.previewType !== type ||
    Number(previewRoot.dataset.previewVariant) !== normalized;
  if (needsRebuild) {
    previewRoot.innerHTML = createPdfLayoutPreviewMarkup(type, normalized);
    previewRoot.dataset.previewType = type;
    previewRoot.dataset.previewVariant = String(normalized);
    delete previewRoot.dataset.sectionClicksBound;
    delete previewRoot.dataset.labelsBound;
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
  if (isAngebot) fillPdfTemplateAngebotForm(form, tpl);
  else fillPdfTemplateRechnungForm(form, tpl);
  syncColorHexFields(form);
  updatePdfTemplatePreview(form, previewRoot, type, variant);
  bindPdfTemplatePreviewSectionClicks(form, previewRoot);
  bindPdfTemplatePreviewRegionLabels(form, previewRoot);
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
  if (!confirm('Vorlage auf Standardwerte zurücksetzen? Gespeicherte Bilder gehen verloren.')) {
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
    updatePdfTemplatePreview(form, previewRoot, type, variant);
    bindPdfTemplatePreviewSectionClicks(form, previewRoot);
    bindPdfTemplatePreviewRegionLabels(form, previewRoot);
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
  bindPdfTemplatePreviewRegionLabels(form, previewRoot);

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

  const isKlassisch = activeLayout === 1;
  root.querySelectorAll('.pdf-klassisch-table-opt').forEach((el) => {
    el.classList.toggle('hidden', !isKlassisch);
  });
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
  els.archivListe.innerHTML = `<p class="empty">${t('archiv.loadingOffers')}</p>`;

  try {
    let angebote = await getAllAngebote();

    if (q) {
      angebote = angebote.filter(
        (a) =>
          a.angebotNr.toLowerCase().includes(q) ||
          a.kunde.name.toLowerCase().includes(q) ||
          matchesDateSearch(
            q,
            a.angebotsdatum,
            a.gueltigBis,
            a.erstelltAm,
            a.aktualisiertAm
          )
      );
    }

    if (angebote.length === 0) {
      els.archivListe.innerHTML = `<p class="empty">${
        q ? t('archiv.notFoundOffers') : t('archiv.noOffers')
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
          <div class="archiv-info" role="button" tabindex="0" aria-label="Angebot ${escapeHtml(a.angebotNr)} bearbeiten">
            <div class="archiv-top">
              <strong>${a.angebotNr}</strong>
            </div>
            <p class="archiv-kunde">${kunde}</p>
            <p class="archiv-meta">Zuletzt bearbeitet: ${datum} · ${posten.length} Posten</p>
          </div>
          <div class="archiv-aside">
            <span class="archiv-betrag">${formatEuro(brutto)}</span>
            <div class="archiv-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-action="rechnung" data-id="${a.id}">Rechnung erstellen</button>
              <button type="button" class="btn btn-ghost btn-sm" data-action="pdf" data-id="${a.id}">PDF ansehen</button>
              ${deleteIconButton(t('common.delete'), `data-action="delete" data-id="${a.id}"`)}
            </div>
          </div>
        </article>
      `;
      })
      .join('');
  } catch (err) {
    els.archivListe.innerHTML = `<p class="empty">${t('archiv.loadError', { message: err.message })}</p>`;
  }
}

async function renderRechnungArchiv() {
  const q = (els.rechnungArchivSuche?.value || '').trim().toLowerCase();
  els.rechnungArchivListe.innerHTML = `<p class="empty">${t('archiv.loadingInvoices')}</p>`;

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
        q ? t('archiv.notFoundInvoices') : t('archiv.noInvoices')
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
          <div class="archiv-info" role="button" tabindex="0" aria-label="Rechnung ${escapeHtml(r.rechnungNr)} bearbeiten">
            <div class="archiv-top">
              <strong>${r.rechnungNr}</strong>
            </div>
            <p class="archiv-kunde">${kunde}</p>
            ${angebotHint}
            <p class="archiv-meta">Zuletzt bearbeitet: ${datum} · ${posten.length} Posten</p>
          </div>
          <div class="archiv-aside">
            <span class="archiv-betrag">${formatEuro(brutto)}</span>
            <div class="archiv-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-action="pdf" data-id="${r.id}">PDF ansehen</button>
              ${deleteIconButton(t('common.delete'), `data-action="delete" data-id="${r.id}"`)}
            </div>
          </div>
        </article>
      `;
      })
      .join('');
  } catch (err) {
    els.rechnungArchivListe.innerHTML = `<p class="empty">${t('archiv.loadError', { message: err.message })}</p>`;
  }
}

function resetKundenForm() {
  state.editingKundeId = null;
  els.kundenForm.reset();
  if (els.kundenFormAnrede) els.kundenFormAnrede.value = '';
  if (els.kundenFormKundenNr) {
    els.kundenFormKundenNr.value = '';
    els.kundenFormKundenNr.placeholder = t('form.customerNumberPlaceholder');
  }
  els.kundenFormTitle.textContent = t('kunden.new');
}

function openKundenForm() {
  els.kundenFormSection?.classList.remove('hidden');
  els.kundenFormSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeKundenForm() {
  resetKundenForm();
  els.kundenFormSection?.classList.add('hidden');
}

function closeKundenDetail() {
  state.detailKundeId = null;
  els.kundenDetail?.classList.add('hidden');
}

async function openKundenDetail(kundeId) {
  closeKundenForm();
  state.detailKundeId = kundeId;
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

    els.kundenDetailTitle.textContent = formatKundeDisplayName(kunde) || kunde.name;
    if (els.kundenDetailKundenNr) {
      els.kundenDetailKundenNr.textContent = kunde.kundenNr || '—';
    }
    if (els.kundenDetailAnrede) {
      els.kundenDetailAnrede.textContent = formatKundeAnredeLabel(kunde.anrede);
    }
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
  } catch (err) {
    els.kundenDetailDokumente.innerHTML = `<p class="empty">Fehler beim Laden: ${escapeHtml(err.message)}</p>`;
  }
}

function loadKundeIntoForm(kunde) {
  if (state.detailKundeId) {
    state.detailKundeId = null;
    els.kundenDetail?.classList.add('hidden');
  }
  state.editingKundeId = kunde.id;
  if (els.kundenFormAnrede) {
    els.kundenFormAnrede.value = normalizeKundeAnrede(kunde.anrede);
  }
  if (els.kundenFormKundenNr) {
    els.kundenFormKundenNr.value = kunde.kundenNr || '';
    els.kundenFormKundenNr.placeholder = kunde.kundenNr ? '' : t('form.customerNumberPlaceholder');
  }
  els.kundenFormName.value = kunde.name;
  setAdresseFieldPair(els.kundenFormStrasse, els.kundenFormPlzOrt, kunde);
  els.kundenFormTelefon.value = kunde.telefon || '';
  els.kundenFormEmail.value = kunde.email || '';
  els.kundenFormNotiz.value = kunde.notiz || '';
  els.kundenFormTitle.textContent = t('kunden.edit');
  openKundenForm();
  showView('kunden');
  els.kundenFormSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function refreshPostenEditors() {
  angebotPostenEditor.render();
  rechnungPostenEditor.render();
}

function mountStaticActionIcons() {
  mountIconButton(els.katalogNeuBtn, {
    type: 'add',
    label: t('form.newCatalogItem'),
    variant: 'ghost',
  });
  mountIconButton(els.kundenNeuBtn, {
    type: 'add',
    label: t('kunden.newBtn'),
    variant: 'primary',
  });
  mountIconButton(els.kundenDetailEdit, {
    type: 'edit',
    label: t('common.edit'),
  });
}

function resetKatalogForm() {
  state.editingKatalogPostenId = null;
  els.katalogForm?.reset();
  if (els.katalogFormTitle) els.katalogFormTitle.textContent = t('form.catalogNewItem');
}

function openKatalogForm() {
  els.katalogFormSection?.classList.remove('hidden');
  els.katalogFormSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeKatalogForm() {
  resetKatalogForm();
  els.katalogFormSection?.classList.add('hidden');
}

function fillKatalogForm(posten) {
  state.editingKatalogPostenId = posten.id;
  els.katalogFormBezeichnung.value = posten.bezeichnung || '';
  els.katalogFormBeschreibung.value = posten.beschreibung || '';
  if (els.katalogFormArt) {
    els.katalogFormArt.value = normalizePostenArt(posten.art);
  }
  els.katalogFormPreisStk.value =
    posten.preisStk != null && posten.preisStk !== '' ? String(posten.preisStk).replace('.', ',') : '';
  els.katalogFormPreisStd.value =
    posten.preisStd != null && posten.preisStd !== '' ? String(posten.preisStd).replace('.', ',') : '';
  if (els.katalogFormTitle) els.katalogFormTitle.textContent = t('form.catalogEditItem');
  openKatalogForm();
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
        const artLabel = formatPostenArt(p.art);
        return `
        <article class="katalog-posten-item" data-id="${p.id}">
          <div class="katalog-posten-item__main">
            <h3>${escapeHtml(p.bezeichnung)}</h3>
            ${p.beschreibung ? `<p class="katalog-posten-item__desc">${escapeHtml(p.beschreibung)}</p>` : ''}
            <p class="katalog-posten-item__preise">${escapeHtml(artLabel)} · ${preisStk} / Stk. · ${preisStd} / Std.</p>
          </div>
          <div class="katalog-posten-item__actions">
            ${editIconButton(t('common.edit'), `data-action="edit-katalog-posten" data-id="${p.id}"`)}
            ${deleteIconButton(t('common.delete'), `data-action="delete-katalog-posten" data-id="${p.id}"`)}
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
    art: normalizePostenArt(els.katalogFormArt?.value),
    preisStk,
    preisStd,
    erstelltAm,
    aktualisiertAm: jetzt,
  };

  try {
    await saveKatalogPosten(posten);
    state.katalogSuche = '';
    if (els.katalogSuche) els.katalogSuche.value = '';
    closeKatalogForm();
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
  els.kundenListe.innerHTML = `<p class="empty">${t('kunden.loading')}</p>`;

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
        q ? t('kunden.notFound') : t('kunden.none')
      }</p>`;
      return;
    }

    if (!filtered.some((k) => k.id === state.expandedKundeDokumenteId)) {
      state.expandedKundeDokumenteId = null;
    }

    els.kundenListe.innerHTML = filtered
      .map((k) => {
        const kontakt = [k.telefon, k.email].filter((v) => (v || '').trim()).join(' · ');
        const nrPrefix = k.kundenNr ? `<span class="kunden-info__nr">${escapeHtml(k.kundenNr)}</span> · ` : '';
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
              <h3>${nrPrefix}${escapeHtml(k.name)}</h3>
              ${formatKundeAnredeLabel(k.anrede) !== '—' ? `<p class="kunden-info__anrede">${escapeHtml(formatKundeAnredeLabel(k.anrede))}</p>` : ''}
              ${formatAdresseHtml(k) ? `<p>${formatAdresseHtml(k)}</p>` : ''}
              ${kontakt ? `<p class="kunden-info__kontakt">${escapeHtml(kontakt)}</p>` : ''}
            </div>
            <div class="kunden-actions">
              <button type="button" class="btn btn-primary btn-sm" data-action="show-kunde-detail" data-id="${k.id}">${escapeHtml(t('common.open'))}</button>
              ${editIconButton(t('common.edit'), `data-action="edit-kunde" data-id="${k.id}"`)}
              ${deleteIconButton(t('common.delete'), `data-action="delete-kunde" data-id="${k.id}"`)}
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
            <h3>${k.kundenNr ? `<span class="kunden-info__nr">${escapeHtml(k.kundenNr)}</span> · ` : ''}${escapeHtml(k.name)}</h3>
            ${formatKundeAnredeLabel(k.anrede) !== '—' ? `<p class="kunden-info__anrede">${escapeHtml(formatKundeAnredeLabel(k.anrede))}</p>` : ''}
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
  let kundenNr = bestehend?.kundenNr || '';
  if (!kundenNr) {
    kundenNr = await generiereKundennummer(getAllKunden);
  }

  const kunde = {
    id: isEdit ? state.editingKundeId : createKundeId(),
    kundenNr,
    anrede: normalizeKundeAnrede(els.kundenFormAnrede?.value),
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
    closeKundenForm();
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

async function persistAngebotFromForm() {
  angebotPostenEditor.flushEntwurfIfComplete();
  const posten = angebotPostenEditor.getAusgewaehltePosten();
  if (posten.length === 0 || !isAngebotKopfComplete()) return null;

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
  return { angebot, posten };
}

async function persistRechnungFromForm() {
  rechnungPostenEditor.flushEntwurfIfComplete();
  const posten = rechnungPostenEditor.getAusgewaehltePosten();
  if (posten.length === 0 || !isRechnungKopfComplete()) return null;

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
  return { rechnung, posten };
}

function setAngebotFooterBusy(busy) {
  [els.saveBtn, els.resetBtn, els.pdfBtn, els.previewBtn].forEach((btn) => {
    if (btn) btn.disabled = busy;
  });
}

function setRechnungFooterBusy(busy) {
  [els.rechnungSaveBtn, els.rechnungResetBtn, els.rechnungPdfBtn, els.rechnungPreviewBtn].forEach((btn) => {
    if (btn) btn.disabled = busy;
  });
}

let documentPreviewKind = null;
let documentPreviewData = null;

async function buildAngebotPreviewData() {
  angebotPostenEditor.flushEntwurfIfComplete();
  const posten = angebotPostenEditor.getAusgewaehltePosten();
  if (posten.length === 0 || !isAngebotKopfComplete()) return null;
  const angebot = await getFormAngebot();
  return { type: 'angebot', document: angebot, posten };
}

async function buildRechnungPreviewData() {
  rechnungPostenEditor.flushEntwurfIfComplete();
  const posten = rechnungPostenEditor.getAusgewaehltePosten();
  if (posten.length === 0 || !isRechnungKopfComplete()) return null;
  const rechnung = await getFormRechnung();
  return { type: 'rechnung', document: rechnung, posten };
}

async function openDocumentPreviewModal(kind) {
  if (!els.documentPreviewModal || !els.documentPreviewContent) return;

  const previewData =
    kind === 'rechnung' ? await buildRechnungPreviewData() : await buildAngebotPreviewData();
  if (!previewData) {
    alert(getPersistIncompleteMessage(kind));
    return;
  }

  documentPreviewKind = previewData.type;
  documentPreviewData = previewData;
  els.documentPreviewContent.innerHTML = '';

  els.documentPreviewModal.classList.remove('hidden');
  els.documentPreviewModal.setAttribute('aria-hidden', 'false');

  updateDocumentLayoutPreview(
    els.documentPreviewContent,
    previewData.type,
    previewData.document,
    previewData.posten,
    getPdfTemplate()
  );

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fitDocumentPreviewPage();
      els.documentPreviewModal.querySelector('[data-close-document-preview].btn')?.focus();
    });
  });
}

function fitDocumentPreviewPage(retry = 0) {
  const viewport = els.documentPreviewViewport;
  const sheet = els.documentPreviewContent?.querySelector('.pdf-layout-preview__sheet');
  if (!viewport || !sheet) return;

  sheet.style.width = '';
  sheet.style.height = '';
  sheet.style.maxWidth = '';
  sheet.style.aspectRatio = '';

  const { width: cw, height: ch } = viewport.getBoundingClientRect();
  if (cw <= 0 || ch <= 0) {
    if (retry < 4) {
      requestAnimationFrame(() => fitDocumentPreviewPage(retry + 1));
      return;
    }
    sheet.style.width = '100%';
    sheet.style.maxWidth = '420px';
    sheet.style.aspectRatio = '210 / 297';
    sheet.style.height = 'auto';
    return;
  }

  const pageRatio = 210 / 297;
  let pageWidth = cw;
  let pageHeight = pageWidth / pageRatio;
  if (pageHeight > ch) {
    pageHeight = ch;
    pageWidth = pageHeight * pageRatio;
  }

  sheet.style.width = `${Math.floor(pageWidth)}px`;
  sheet.style.height = `${Math.floor(pageHeight)}px`;
}

async function openDocumentPreviewPdfTab() {
  if (!documentPreviewData) return;

  const { type, document, posten } = documentPreviewData;
  try {
    if (type === 'rechnung') {
      await openRechnungPdfPreview(document, posten);
    } else {
      openPdfPreview(document, posten);
    }
  } catch (err) {
    alert(`PDF konnte nicht geöffnet werden: ${err.message}`);
  }
}

function closeDocumentPreviewModal() {
  if (!els.documentPreviewModal) return;
  els.documentPreviewModal.classList.add('hidden');
  els.documentPreviewModal.setAttribute('aria-hidden', 'true');
  documentPreviewKind = null;
  documentPreviewData = null;
  if (els.documentPreviewContent) els.documentPreviewContent.innerHTML = '';
}

async function sendDocumentFromPreviewModal() {
  const kind = documentPreviewKind;
  if (!kind) return;
  closeDocumentPreviewModal();
  if (kind === 'rechnung') {
    await speichernUndRechnungPdfAnKundenSenden();
  } else {
    await speichernUndPdfAnKundenSenden();
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function resolveDocumentKundeEmail(selectedKundeId, formEmailEl) {
  const fromForm = (formEmailEl?.value || '').trim();
  if (fromForm) return fromForm;
  if (!selectedKundeId) return '';
  const kunde = await getKunde(selectedKundeId);
  return (kunde?.email || '').trim();
}

function getPersistIncompleteMessage(kind) {
  const isAngebot = kind === 'angebot';
  const postenEditor = isAngebot ? angebotPostenEditor : rechnungPostenEditor;
  const kopfComplete = isAngebot ? isAngebotKopfComplete() : isRechnungKopfComplete();

  if (postenEditor.getAusgewaehltePosten().length === 0) {
    return 'Bitte mindestens einen Posten hinzufügen.';
  }
  if (!kopfComplete) {
    return 'Bitte alle Pflichtfelder unter „Allgemeine Informationen“ ausfüllen.';
  }
  return 'Das Dokument konnte nicht gespeichert werden.';
}

async function ensureDocumentMailReady(selectedKundeId, formEmailEl) {
  const kundeEmail = await resolveDocumentKundeEmail(selectedKundeId, formEmailEl);
  if (!kundeEmail) {
    throw new Error('Bitte eine Kunden-E-Mail im Formular eintragen oder im Kundenstamm hinterlegen.');
  }

  const userEmail = getSession()?.user?.email?.trim();
  if (!userEmail) {
    throw new Error('Ihre Profil-E-Mail konnte nicht ermittelt werden.');
  }

  return kundeEmail;
}

async function sendAngebotPdfByMail(angebot, posten) {
  const kundeEmail = await ensureDocumentMailReady(state.angebot.selectedKundeId, els.kundeEmail);

  const firmaName = withProfileFirma(getPdfTemplate(), getSession()).firma?.name || 'Ihr Unternehmen';
  const { filename, content } = getAngebotPdfAttachment(angebot, posten);

  const sendResult = await sendDocumentPdf({
    type: 'angebot',
    to: kundeEmail,
    subject: `Angebot ${angebot.angebotNr} – ${firmaName}`,
    text: `Guten Tag,\n\nanbei erhalten Sie unser Angebot ${angebot.angebotNr}.\n\nMit freundlichen Grüßen\n${firmaName}`,
    filename,
    pdfBase64: arrayBufferToBase64(content),
  });

  return { kundeEmail, sendResult };
}

function formatDocumentSendSuccess(kind, kundeEmail, sendResult) {
  const docLabel = kind === 'rechnung' ? 'Rechnung' : 'Angebot';

  if (sendResult?.previewUrl) {
    window.open(sendResult.previewUrl, '_blank', 'noopener,noreferrer');
    return `${docLabel} im Test-Modus erstellt — keine echte E-Mail im Postfach.\n\nVorschau im neuen Tab geöffnet.\nGeplanter Empfänger: ${kundeEmail}`;
  }

  return `${docLabel} wurde an ${kundeEmail} gesendet. Eine Kopie geht an ${getSession()?.user?.email}.`;
}

async function refreshMailSendHints() {
  const hintEls = [els.pdfSendHint, els.rechnungPdfSendHint].filter(Boolean);
  if (!hintEls.length) return;

  try {
    const status = await fetchMailStatus();
    const hint = status?.hint || '';
    hintEls.forEach((el) => {
      el.textContent = hint;
      el.classList.toggle('hidden', !hint);
      el.classList.toggle('pdf-footer__mail-hint--dev', Boolean(status?.devMode));
    });
  } catch {
    hintEls.forEach((el) => el.classList.add('hidden'));
  }
}

async function sendRechnungPdfByMail(rechnung, posten) {
  const kundeEmail = await ensureDocumentMailReady(
    state.rechnung.selectedKundeId,
    els.rechnungKundeEmail
  );

  const firmaName = withProfileFirma(getPdfTemplate(), getSession()).firma?.name || 'Ihr Unternehmen';
  const { filename, content } = await getRechnungPdfAttachment(rechnung, posten);

  const sendResult = await sendDocumentPdf({
    type: 'rechnung',
    to: kundeEmail,
    subject: `Rechnung ${rechnung.rechnungNr} – ${firmaName}`,
    text: `Guten Tag,\n\nanbei erhalten Sie unsere Rechnung ${rechnung.rechnungNr}.\n\nMit freundlichen Grüßen\n${firmaName}`,
    filename,
    pdfBase64: arrayBufferToBase64(content),
  });

  return { kundeEmail, sendResult };
}

async function speichernAngebot() {
  setAngebotFooterBusy(true);
  try {
    const result = await persistAngebotFromForm();
    if (!result) return;
  } catch (err) {
    alert(`Speichern fehlgeschlagen: ${err.message}`);
  } finally {
    angebotPostenEditor.render();
  }
}

async function speichernAngebotUndSchliessen() {
  setAngebotFooterBusy(true);
  try {
    const result = await persistAngebotFromForm();
    if (!result) return;
    await resetForm();
  } catch (err) {
    alert(`Speichern fehlgeschlagen: ${err.message}`);
  } finally {
    angebotPostenEditor.render();
  }
}

async function speichernUndPdf() {
  setAngebotFooterBusy(true);
  try {
    const result = await persistAngebotFromForm();
    if (!result) return;
    downloadPdf(result.angebot, result.posten);
  } catch (err) {
    alert(`Speichern fehlgeschlagen: ${err.message}`);
  } finally {
    angebotPostenEditor.render();
  }
}

async function speichernUndPdfAnKundenSenden() {
  setAngebotFooterBusy(true);
  try {
    await ensureDocumentMailReady(state.angebot.selectedKundeId, els.kundeEmail);
    const result = await persistAngebotFromForm();
    if (!result) {
      alert(getPersistIncompleteMessage('angebot'));
      return;
    }
    const { kundeEmail, sendResult } = await sendAngebotPdfByMail(result.angebot, result.posten);
    alert(formatDocumentSendSuccess('angebot', kundeEmail, sendResult));
  } catch (err) {
    alert(`Versand fehlgeschlagen: ${err.message}`);
  } finally {
    angebotPostenEditor.render();
  }
}

async function speichernRechnung() {
  setRechnungFooterBusy(true);
  try {
    const result = await persistRechnungFromForm();
    if (!result) return;
  } catch (err) {
    alert(`Speichern fehlgeschlagen: ${err.message}`);
  } finally {
    rechnungPostenEditor.render();
  }
}

async function speichernRechnungUndSchliessen() {
  setRechnungFooterBusy(true);
  try {
    const result = await persistRechnungFromForm();
    if (!result) return;
    await resetRechnungForm();
  } catch (err) {
    alert(`Speichern fehlgeschlagen: ${err.message}`);
  } finally {
    rechnungPostenEditor.render();
  }
}

async function speichernUndRechnungPdf() {
  setRechnungFooterBusy(true);
  try {
    const result = await persistRechnungFromForm();
    if (!result) return;
    await downloadRechnungPdf(result.rechnung, result.posten);
  } catch (err) {
    alert(`Speichern fehlgeschlagen: ${err.message}`);
  } finally {
    rechnungPostenEditor.render();
  }
}

async function speichernUndRechnungPdfAnKundenSenden() {
  setRechnungFooterBusy(true);
  try {
    await ensureDocumentMailReady(state.rechnung.selectedKundeId, els.rechnungKundeEmail);
    const result = await persistRechnungFromForm();
    if (!result) {
      alert(getPersistIncompleteMessage('rechnung'));
      return;
    }
    const { kundeEmail, sendResult } = await sendRechnungPdfByMail(result.rechnung, result.posten);
    alert(formatDocumentSendSuccess('rechnung', kundeEmail, sendResult));
  } catch (err) {
    alert(`Versand fehlgeschlagen: ${err.message}`);
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
  els.authTitle.textContent = isLogin ? t('auth.login') : t('auth.register');
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
  els.loginUser.value = 'admin';
  els.loginPass.value = 'admin';
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
  syncImpersonationBanner();

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
  await refreshMailSendHints();
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
  updateAllKundeSaveButtonStates();
  initKatalogModal({
    modal: els.katalogModal,
    liste: els.katalogModalListe,
    suche: els.katalogModalSuche,
    openButtons: [
      { button: els.katalogOeffnenBtn, editor: angebotPostenEditor },
      { button: els.rechnungKatalogOeffnenBtn, editor: rechnungPostenEditor },
    ],
  });
  els.profileBtn?.addEventListener('click', () => {
    showView('profil');
    closeMobileNav();
  });
  els.adminBtn?.addEventListener('click', () => {
    showView('admin');
    closeMobileNav();
  });
  els.adminImpersonationStopBtn?.addEventListener('click', () => {
    void stopAdminImpersonationFlow();
  });
  els.adminImpersonationArchivBtn?.addEventListener('click', () => {
    state.bereich = 'angebote';
    syncBereichSwitcher();
    syncBereichNav();
    showView('archiv');
  });
  els.adminImpersonationRechnungenBtn?.addEventListener('click', () => {
    state.bereich = 'rechnungen';
    syncBereichSwitcher();
    syncBereichNav();
    showView('rechnung-archiv');
  });
  els.adminUserList?.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-admin-open-tenant]');
    if (openBtn) {
      void openAdminTenant(openBtn.dataset.adminOpenTenant, 'archiv');
      return;
    }

    const toggleBtn = e.target.closest('[data-admin-toggle-detail]');
    if (!toggleBtn) return;

    const tenantId = toggleBtn.dataset.adminToggleDetail;
    const detailRow = els.adminUserList.querySelector(
      `[data-admin-detail-row="${CSS.escape(tenantId)}"]`
    );
    if (!detailRow) return;

    const willOpen = detailRow.classList.contains('hidden');
    els.adminUserList
      .querySelectorAll('.admin-user-detail-row')
      .forEach((row) => row.classList.add('hidden'));
    if (!willOpen) return;

    detailRow.classList.remove('hidden');
    const host = detailRow.querySelector('[data-admin-detail-host]');
    void loadAdminUserDetail(tenantId, host);
  });
  els.profilAccountForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setProfilAccountStatus('');

    const name = els.profilTenantName?.value.trim() || '';
    if (!name) {
      setProfilAccountStatus('Firmenname ist erforderlich.', true);
      return;
    }

    try {
      const patch = templatePatchFromForm(els.profilAccountForm, 'firma');
      const current = getPdfTemplate();
      const session = getSession();
      await savePdfTemplate({
        ...current,
        firma: {
          ...current.firma,
          ...patch.firma,
          email: patch.firma.email || session?.user?.email || '',
        },
      });
      await updateTenantName(name);
      await refreshSession();
      syncProfileButton();
      refreshPdfTemplatePreviewsFromProfile();
      setProfilAccountStatus('Profil wurde gespeichert.');
    } catch (err) {
      setProfilAccountStatus(err.message || 'Profil konnte nicht gespeichert werden.', true);
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

  els.resetBtn?.addEventListener('click', () => resetForm());
  els.saveBtn?.addEventListener('click', () => speichernAngebot());
  els.pdfBtn.addEventListener('click', () => speichernUndPdf());
  els.previewBtn?.addEventListener('click', () => openDocumentPreviewModal('angebot'));
  els.rechnungResetBtn?.addEventListener('click', () => resetRechnungForm());
  els.rechnungSaveBtn?.addEventListener('click', () => speichernRechnung());
  els.rechnungPdfBtn?.addEventListener('click', () => speichernUndRechnungPdf());
  els.rechnungPreviewBtn?.addEventListener('click', () => openDocumentPreviewModal('rechnung'));

  els.documentPreviewModal?.querySelectorAll('[data-close-document-preview]').forEach((el) => {
    el.addEventListener('click', () => closeDocumentPreviewModal());
  });
  els.documentPreviewSendBtn?.addEventListener('click', () => sendDocumentFromPreviewModal());
  els.documentPreviewViewport?.addEventListener('dblclick', () => {
    void openDocumentPreviewPdfTab();
  });

  els.kundeAuswahlBtn.addEventListener('click', () => openKundenModal('angebot'));
  els.kundeSaveBtn?.addEventListener('click', () => saveDocumentKundeFromForm('angebot'));
  els.kundeName.addEventListener('input', clearKundeAuswahl);
  els.rechnungKundeAuswahlBtn?.addEventListener('click', () => openKundenModal('rechnung'));
  els.rechnungKundeSaveBtn?.addEventListener('click', () => saveDocumentKundeFromForm('rechnung'));
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
  els.kundenFormReset?.addEventListener('click', closeKundenForm);

  els.katalogForm?.addEventListener('submit', saveKatalogForm);
  els.katalogFormReset?.addEventListener('click', closeKatalogForm);
  bindPreisBlurFormat(els.katalogFormPreisStk, els.katalogFormPreisStd);
  els.katalogNeuBtn?.addEventListener('click', () => {
    resetKatalogForm();
    openKatalogForm();
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
        if (state.editingKatalogPostenId === id) closeKatalogForm();
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
    }
    resetKundenForm();
    openKundenForm();
    els.kundenFormSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.kundenFormName?.focus();
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
          if (state.editingKundeId === id) closeKundenForm();
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
    if (btn) {
      const { action, id } = btn.dataset;

      try {
        const angebot = await getAngebot(id);
        if (!angebot) return;

        if (action === 'rechnung') {
          await loadAngebotAsRechnungEntwurf(angebot);
        } else if (action === 'pdf') {
          openPdfPreview(angebot, resolvePostenDetails(angebot.posten));
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
      return;
    }

    const info = e.target.closest('.archiv-info');
    if (!info) return;
    const item = info.closest('.archiv-item');
    if (!item?.dataset.id) return;

    try {
      const angebot = await getAngebot(item.dataset.id);
      if (angebot) await loadAngebotIntoForm(angebot);
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  });

  els.archivListe.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const info = e.target.closest('.archiv-info');
    if (!info) return;
    e.preventDefault();
    info.click();
  });

  els.rechnungArchivListe?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      const { action, id } = btn.dataset;

      try {
        const rechnung = await getRechnung(id);
        if (!rechnung) return;

        if (action === 'pdf') {
          openRechnungPdfPreview(rechnung, resolvePostenDetails(rechnung.posten));
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
      return;
    }

    const info = e.target.closest('.archiv-info');
    if (!info) return;
    const item = info.closest('.archiv-item');
    if (!item?.dataset.id) return;

    try {
      const rechnung = await getRechnung(item.dataset.id);
      if (rechnung) await loadRechnungIntoForm(rechnung);
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  });

  els.rechnungArchivListe?.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const info = e.target.closest('.archiv-info');
    if (!info) return;
    e.preventDefault();
    info.click();
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

async function refreshLocaleUi() {
  applyI18n();
  syncSidebarCollapseUi();
  syncBereichSwitcher();
  updatePageHeader();
  updateRechnungPageHeader();
  updateAngebotKopfSummary();
  updateRechnungKopfSummary();
  updatePostenKopfSummary();
  updateRechnungPostenKopfSummary();

  if (els.authTitle && els.loginScreen && !els.loginScreen.classList.contains('hidden')) {
    const isLogin = els.loginForm && !els.loginForm.classList.contains('hidden');
    els.authTitle.textContent = isLogin ? t('auth.login') : t('auth.register');
  }

  if (state.editingKundeId) {
    els.kundenFormTitle.textContent = t('kunden.edit');
  } else if (!els.kundenFormSection?.classList.contains('hidden')) {
    els.kundenFormTitle.textContent = t('kunden.new');
  }

  if (els.kundenFormKundenNr && !els.kundenFormKundenNr.value.trim()) {
    els.kundenFormKundenNr.placeholder = t('form.customerNumberPlaceholder');
  }

  if (els.katalogFormTitle) {
    els.katalogFormTitle.textContent = state.editingKatalogPostenId
      ? t('form.catalogEditItem')
      : t('form.catalogNewItem');
  }

  mountStaticActionIcons();

  refreshPostenEditors();
  refreshDatePickers();
  refreshPdfTemplateFormLabels();
  if (els.pdfAngebotForm && els.pdfPreviewAngebot?.dataset.previewType) {
    updatePdfTemplatePreview(
      els.pdfAngebotForm,
      els.pdfPreviewAngebot,
      'angebot',
      getPdfLayoutVariant('angebot')
    );
  }
  if (els.pdfRechnungForm && els.pdfPreviewRechnung?.dataset.previewType) {
    updatePdfTemplatePreview(
      els.pdfRechnungForm,
      els.pdfPreviewRechnung,
      'rechnung',
      getPdfLayoutVariant('rechnung')
    );
  }

  if (els.app?.classList.contains('hidden')) return;

  if (state.view === 'archiv') await renderArchiv();
  else if (state.view === 'rechnung-archiv') await renderRechnungArchiv();
  else if (state.view === 'kunden') await renderKundenView();
  else if (state.view === 'katalog') await renderKatalogView();
  else if (state.view === 'dashboard') await renderDashboardView();
  else if (state.detailKundeId) await refreshKundenDetail();
}

async function bootstrap() {
  initTheme();
  initI18n();
  initLangSwitcher();
  mountStaticActionIcons();
  onLocaleChange(() => {
    void refreshLocaleUi();
  });
  syncBereichMarks();
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
