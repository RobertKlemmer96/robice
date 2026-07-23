import {
  getPdfTemplate,
  loadPdfTemplate,
  mergePdfTemplate,
  savePdfTemplate,
  templatePatchFromForm,
} from './pdfTemplate.js';
import { getSession, isLoggedIn, markOnboardingComplete, needsOnboarding, updateTenantName } from './auth.js';
import {
  previewAngebotsnummer,
  previewRechnungsnummer,
  schemaHasSequenceToken,
} from './dokumentnummer.js';
import { ENABLED_ONBOARDING_STEPS, ONBOARDING_STEPS } from './onboardingConfig.js';
import { PDF_LAYOUT_VARIANTS, normalizePdfLayoutVariant } from './pdfLayoutVariants.js';

let screenEl = null;
let progressFillEl = null;
let progressStepsEl = null;
let firmaFormEl = null;
let nummernFormEl = null;
let layoutFormEl = null;
let layoutOptionsEl = null;
let backBtn = null;
let nextBtn = null;
let statusEl = null;
let currentStepIndex = 0;
let onCompleteCallback = null;

function setStatus(message, isError = false) {
  if (!statusEl) return;
  if (!message) {
    statusEl.classList.add('hidden');
    statusEl.textContent = '';
    statusEl.classList.remove('settings-status--error');
    return;
  }
  statusEl.textContent = message;
  statusEl.classList.toggle('settings-status--error', isError);
  statusEl.classList.remove('hidden');
}

function updateSchemaPreviews() {
  if (!nummernFormEl) return;
  const angebotInput = nummernFormEl.elements['angebot-nummer-schema'];
  const rechnungInput = nummernFormEl.elements['rechnung-nummer-schema'];
  const angebotPreview = nummernFormEl.querySelector('.onboarding-angebot-preview');
  const rechnungPreview = nummernFormEl.querySelector('.onboarding-rechnung-preview');

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

  updateOne(angebotInput, angebotPreview, previewAngebotsnummer);
  updateOne(rechnungInput, rechnungPreview, previewRechnungsnummer);
}

function renderLayoutOptions() {
  if (!layoutOptionsEl) return;
  layoutOptionsEl.innerHTML = Object.values(PDF_LAYOUT_VARIANTS)
    .map(
      (variant) => `
      <label class="onboarding-layout-option">
        <input type="radio" name="pdf-layout" value="${variant.id}" />
        <span class="onboarding-layout-option__text">
          <strong>${variant.label}</strong>
          <span>${variant.hint}</span>
        </span>
      </label>`
    )
    .join('');
}

function getSelectedLayoutVariant() {
  const selected = layoutFormEl?.querySelector('input[name="pdf-layout"]:checked');
  return normalizePdfLayoutVariant(selected?.value ?? 1);
}

function fillLayoutStep() {
  if (!layoutFormEl) return;
  const tpl = mergePdfTemplate(getPdfTemplate());
  const variant = normalizePdfLayoutVariant(
    tpl.layout?.angebotVariant ?? tpl.layout?.rechnungVariant ?? 1
  );
  const input = layoutFormEl.querySelector(`input[name="pdf-layout"][value="${variant}"]`);
  if (input) input.checked = true;
  else {
    const fallback = layoutFormEl.querySelector('input[name="pdf-layout"][value="1"]');
    if (fallback) fallback.checked = true;
  }
}

async function saveLayoutStep() {
  const variant = getSelectedLayoutVariant();
  const current = getPdfTemplate();
  await savePdfTemplate({
    ...current,
    layout: {
      ...current.layout,
      angebotVariant: variant,
      rechnungVariant: variant,
    },
  });
  return true;
}

function renderProgress() {
  if (!progressFillEl || !progressStepsEl) return;

  const totalSteps = ONBOARDING_STEPS.length;
  const globalIndex = ONBOARDING_STEPS.findIndex(
    (step) => step.id === ENABLED_ONBOARDING_STEPS[currentStepIndex]?.id
  );
  const progressPct = ((Math.max(globalIndex, 0) + 1) / totalSteps) * 100;
  progressFillEl.style.width = `${progressPct}%`;

  progressStepsEl.innerHTML = ONBOARDING_STEPS.map((step, index) => {
    const isCurrent = step.id === ENABLED_ONBOARDING_STEPS[currentStepIndex]?.id;
    const isDone = globalIndex >= 0 && index < globalIndex;
    const stateClass = step.soon
      ? 'is-soon'
      : isCurrent
        ? 'is-current'
        : isDone
          ? 'is-done'
          : '';
    return `
      <li class="onboarding-progress__step ${stateClass}">
        <span class="onboarding-progress__dot" aria-hidden="true">${index + 1}</span>
        <span class="onboarding-progress__label">${step.label}</span>
      </li>
    `;
  }).join('');
}

function showStep(index) {
  currentStepIndex = index;
  const stepId = ENABLED_ONBOARDING_STEPS[currentStepIndex]?.id;

  screenEl?.querySelectorAll('[data-onboarding-step]').forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.onboardingStep !== stepId);
  });

  backBtn?.classList.toggle('hidden', currentStepIndex === 0);
  if (nextBtn) {
    nextBtn.textContent =
      currentStepIndex >= ENABLED_ONBOARDING_STEPS.length - 1 ? 'Fertig' : 'Weiter';
  }

  renderProgress();
  setStatus('');
}

function fillFirmaStep() {
  if (!firmaFormEl) return;
  const session = getSession();
  const tpl = mergePdfTemplate(getPdfTemplate());

  firmaFormEl.elements['firma-name'].value = tpl.firma.name || session?.tenant?.name || '';
  firmaFormEl.elements['firma-strasse'].value = tpl.firma.strasse || '';
  firmaFormEl.elements['firma-plzOrt'].value = tpl.firma.plzOrt || '';
  firmaFormEl.elements['firma-telefon'].value = tpl.firma.telefon || '';
  firmaFormEl.elements['firma-web'].value = tpl.firma.web || '';
  firmaFormEl.elements['firma-ustId'].value = tpl.firma.ustId || '';
  firmaFormEl.elements['firma-iban'].value = tpl.firma.iban || '';
}

function fillNummernStep() {
  if (!nummernFormEl) return;
  const tpl = mergePdfTemplate(getPdfTemplate());
  nummernFormEl.elements['angebot-nummer-schema'].value =
    tpl.angebot?.nummerSchema || 'ANG-{YYYY}{MM}{DD}-{NR:3}';
  nummernFormEl.elements['rechnung-nummer-schema'].value =
    tpl.rechnung?.nummerSchema || 'RE-{YYYY}{MM}{DD}-{NR:3}';
  updateSchemaPreviews();
}

async function saveFirmaStep() {
  if (!firmaFormEl) return false;

  const name = String(firmaFormEl.elements['firma-name']?.value || '').trim();
  const strasse = String(firmaFormEl.elements['firma-strasse']?.value || '').trim();
  const plzOrt = String(firmaFormEl.elements['firma-plzOrt']?.value || '').trim();

  if (!name) {
    setStatus('Bitte geben Sie einen Firmennamen an.', true);
    firmaFormEl.elements['firma-name']?.focus();
    return false;
  }
  if (!strasse) {
    setStatus('Bitte geben Sie Straße und Hausnummer an.', true);
    firmaFormEl.elements['firma-strasse']?.focus();
    return false;
  }
  if (!plzOrt) {
    setStatus('Bitte geben Sie PLZ und Ort an.', true);
    firmaFormEl.elements['firma-plzOrt']?.focus();
    return false;
  }

  const patch = templatePatchFromForm(firmaFormEl, 'firma');
  const current = getPdfTemplate();
  await savePdfTemplate({
    ...current,
    firma: {
      ...current.firma,
      ...patch.firma,
      email: current.firma?.email || getSession()?.user?.email || '',
    },
  });
  await updateTenantName(name);
  return true;
}

async function saveNummernStep() {
  if (!nummernFormEl) return false;

  const angebotSchema = String(
    nummernFormEl.elements['angebot-nummer-schema']?.value || ''
  ).trim();
  const rechnungSchema = String(
    nummernFormEl.elements['rechnung-nummer-schema']?.value || ''
  ).trim();

  if (!angebotSchema || !schemaHasSequenceToken(angebotSchema)) {
    setStatus('Angebots-Schema braucht eine Laufnummer, z. B. {NR:3}.', true);
    nummernFormEl.elements['angebot-nummer-schema']?.focus();
    return false;
  }
  if (!rechnungSchema || !schemaHasSequenceToken(rechnungSchema)) {
    setStatus('Rechnungs-Schema braucht eine Laufnummer, z. B. {NR:3}.', true);
    nummernFormEl.elements['rechnung-nummer-schema']?.focus();
    return false;
  }

  const angebotPatch = templatePatchFromForm(nummernFormEl, 'angebot-nummer');
  const rechnungPatch = templatePatchFromForm(nummernFormEl, 'rechnung-nummer');
  const current = getPdfTemplate();
  await savePdfTemplate({
    ...current,
    ...angebotPatch,
    ...rechnungPatch,
  });
  return true;
}

async function finishOnboarding() {
  if (!(await saveLayoutStep())) return;
  await markOnboardingComplete();
  closeOnboarding();
  await onCompleteCallback?.();
}

async function goNext() {
  const stepId = ENABLED_ONBOARDING_STEPS[currentStepIndex]?.id;
  if (stepId === 'firma') {
    if (!(await saveFirmaStep())) return;
    fillNummernStep();
    showStep(currentStepIndex + 1);
    return;
  }
  if (stepId === 'nummern') {
    if (!(await saveNummernStep())) return;
    fillLayoutStep();
    showStep(currentStepIndex + 1);
    return;
  }
  if (stepId === 'layout') {
    await finishOnboarding();
  }
}

function goBack() {
  if (currentStepIndex <= 0) return;
  showStep(currentStepIndex - 1);
}

export function closeOnboarding() {
  if (!screenEl) return;
  screenEl.classList.add('hidden');
  screenEl.setAttribute('aria-hidden', 'true');
  currentStepIndex = 0;
  setStatus('');
}

export async function openOnboarding() {
  if (!screenEl || !isLoggedIn() || !needsOnboarding()) return;

  await loadPdfTemplate();
  if (!screenEl || !isLoggedIn() || !needsOnboarding()) return;

  fillFirmaStep();
  showStep(0);

  screenEl.classList.remove('hidden');
  screenEl.setAttribute('aria-hidden', 'false');
  firmaFormEl?.elements['firma-name']?.focus();
}

export function initOnboarding({ onComplete } = {}) {
  screenEl = document.getElementById('onboarding-screen');
  progressFillEl = document.getElementById('onboarding-progress-fill');
  progressStepsEl = document.getElementById('onboarding-progress-steps');
  firmaFormEl = document.getElementById('onboarding-firma-form');
  nummernFormEl = document.getElementById('onboarding-nummern-form');
  layoutFormEl = document.getElementById('onboarding-layout-form');
  layoutOptionsEl = document.getElementById('onboarding-layout-options');
  backBtn = document.getElementById('onboarding-back');
  nextBtn = document.getElementById('onboarding-next');
  statusEl = document.getElementById('onboarding-status');
  onCompleteCallback = onComplete;

  backBtn?.addEventListener('click', goBack);
  nextBtn?.addEventListener('click', () => {
    goNext().catch((err) => {
      const message =
        err.status === 404
          ? 'Einrichtung konnte nicht gespeichert werden. Bitte API neu starten (/stop → /start).'
          : err.message || 'Speichern fehlgeschlagen.';
      setStatus(message, true);
    });
  });

  nummernFormEl
    ?.querySelectorAll('[name="angebot-nummer-schema"], [name="rechnung-nummer-schema"]')
    .forEach((input) => {
      input.addEventListener('input', updateSchemaPreviews);
    });

  renderLayoutOptions();
  renderProgress();
}

export function isOnboardingOpen() {
  return screenEl && !screenEl.classList.contains('hidden');
}
