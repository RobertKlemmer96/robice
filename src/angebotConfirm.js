import {
  ANGEBOT_PROZESS_STATUS,
  angebotProzessStatusCssClass,
  normalizeAngebotProzessStatus,
} from './angebotProzessStatus.js';

export function parseAngebotConfirmTokenFromPath(pathname = window.location.pathname) {
  const match = String(pathname || '').match(/^\/angebot\/([0-9a-f-]{36})$/i);
  return match ? match[1] : null;
}

async function fetchPublicAngebot(token) {
  const res = await fetch(`/api/public/angebote/${encodeURIComponent(token)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Angebot konnte nicht geladen werden.');
  }
  return data;
}

async function verifyAngebotPlz(token, plz) {
  const res = await fetch(`/api/public/angebote/${encodeURIComponent(token)}/verify-plz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plz }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Postleitzahl konnte nicht geprüft werden.');
  }
  return data;
}

async function respondToAngebot(token, plz, decision) {
  const res = await fetch(`/api/public/angebote/${encodeURIComponent(token)}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plz, decision }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Antwort konnte nicht gespeichert werden.');
  }
  return data;
}

function hideAllScreens() {
  document.getElementById('landing')?.classList.add('hidden');
  document.getElementById('login-screen')?.classList.add('hidden');
  document.getElementById('app')?.classList.add('hidden');
  document.getElementById('legal-screen')?.classList.add('hidden');
}

export function showAngebotConfirmScreen() {
  hideAllScreens();
  document.getElementById('angebot-confirm-screen')?.classList.remove('hidden');
}

function hideAngebotConfirmScreen() {
  document.getElementById('angebot-confirm-screen')?.classList.add('hidden');
}

function setStep(step) {
  document.querySelectorAll('[data-confirm-step]').forEach((el) => {
    el.classList.toggle('hidden', el.dataset.confirmStep !== step);
  });
}

function setStatus(message, isError = false) {
  const el = document.getElementById('angebot-confirm-status');
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('hidden', !message);
  el.classList.toggle('angebot-confirm__status--error', Boolean(message && isError));
}

function redirectToLanding(showLanding) {
  hideAngebotConfirmScreen();
  window.history.replaceState({}, '', '/');
  showLanding();
}

function formatDecisionLabel(decision) {
  return decision === 'abgelehnt' ? 'abgelehnt' : 'bestätigt';
}

const CUSTOMER_STATUS_LABELS = {
  [ANGEBOT_PROZESS_STATUS.BESTAETIGT]: 'Bestätigt',
  [ANGEBOT_PROZESS_STATUS.ABGELEHNT]: 'Abgelehnt',
};

function setStatusBadge(status) {
  const el = document.getElementById('angebot-confirm-status-badge');
  if (!el) return;

  const normalized = normalizeAngebotProzessStatus(status);
  const label = CUSTOMER_STATUS_LABELS[normalized];
  if (!label) {
    el.textContent = '';
    el.className = 'angebot-confirm__status-badge hidden';
    return;
  }

  el.textContent = label;
  el.className = `angebot-confirm__status-badge prozess-status-badge ${angebotProzessStatusCssClass(normalized)}`;
}

export async function initAngebotConfirm(token, { showLanding }) {
  const plzInput = document.getElementById('angebot-confirm-plz');
  const plzForm = document.getElementById('angebot-confirm-plz-form');
  const plzSubmit = document.getElementById('angebot-confirm-plz-submit');
  const confirmBtn = document.getElementById('angebot-confirm-accept');
  const rejectBtn = document.getElementById('angebot-confirm-reject');
  const titleEl = document.getElementById('angebot-confirm-title');
  const leadEl = document.getElementById('angebot-confirm-lead');
  const metaEl = document.getElementById('angebot-confirm-meta');

  showAngebotConfirmScreen();
  setStep('loading');
  setStatus('');
  setStatusBadge(null);

  let offerMeta;
  try {
    offerMeta = await fetchPublicAngebot(token);
  } catch (err) {
    setStep('error');
    setStatus(err.message || 'Angebot konnte nicht geladen werden.', true);
    window.setTimeout(() => redirectToLanding(showLanding), 3500);
    return;
  }

  if (titleEl) {
    titleEl.textContent = `Angebot ${offerMeta.angebotNr}`;
  }
  if (leadEl) {
    leadEl.textContent = `${offerMeta.firmaName} bittet um Ihre Rückmeldung zu diesem Angebot.`;
  }
  if (metaEl) {
    const parts = [];
    if (offerMeta.kundeName) parts.push(offerMeta.kundeName);
    if (offerMeta.gueltigBis) parts.push(`Gültig bis ${offerMeta.gueltigBis}`);
    metaEl.textContent = parts.join(' · ');
    metaEl.classList.toggle('hidden', parts.length === 0);
  }

  if (offerMeta.alreadyResponded) {
    setStep('done');
    setStatusBadge(offerMeta.decision);
    setStatus(
      `Zu diesem Angebot wurde bereits geantwortet (${formatDecisionLabel(offerMeta.decision)}).`
    );
    window.setTimeout(() => redirectToLanding(showLanding), 3200);
    return;
  }

  setStep('plz');
  plzInput?.focus();

  let verifiedPlz = '';

  plzForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const plz = plzInput?.value.trim() || '';
    const normalizedPlz = plz.replace(/\D/g, '');
    if (!/^\d{5}$/.test(normalizedPlz)) {
      setStatus('Bitte geben Sie eine gültige fünfstellige Postleitzahl ein.', true);
      return;
    }

    setStatus('Postleitzahl wird geprüft…');
    if (plzSubmit) plzSubmit.disabled = true;
    if (plzInput) plzInput.disabled = true;

    try {
      await verifyAngebotPlz(token, normalizedPlz);
      verifiedPlz = normalizedPlz;
      setStatus('');
      setStep('action');
    } catch (err) {
      verifiedPlz = '';
      setStatus(err.message || 'Postleitzahl konnte nicht geprüft werden.', true);
      plzInput?.focus();
    } finally {
      if (plzSubmit) plzSubmit.disabled = false;
      if (plzInput) plzInput.disabled = false;
    }
  });

  async function submitDecision(decision) {
    if (!verifiedPlz) return;
    setStatus('');
    confirmBtn.disabled = true;
    rejectBtn.disabled = true;
    plzSubmit.disabled = true;

    try {
      await respondToAngebot(token, verifiedPlz, decision);
      setStep('done');
      setStatusBadge(decision);
      setStatus(
        decision === 'abgelehnt'
          ? 'Das Angebot wurde abgelehnt. Vielen Dank für Ihre Rückmeldung.'
          : 'Das Angebot wurde bestätigt. Vielen Dank!'
      );
      window.setTimeout(() => redirectToLanding(showLanding), 2800);
    } catch (err) {
      setStatus(err.message || 'Antwort konnte nicht gespeichert werden.', true);
      confirmBtn.disabled = false;
      rejectBtn.disabled = false;
      plzSubmit.disabled = false;
      if ((err.message || '').includes('Postleitzahl')) {
        verifiedPlz = '';
        setStep('plz');
        plzInput?.focus();
      }
    }
  }

  confirmBtn?.addEventListener('click', () => submitDecision('bestaetigt'));
  rejectBtn?.addEventListener('click', () => submitDecision('abgelehnt'));
}

export function finishAngebotConfirmToLanding(showLanding) {
  redirectToLanding(showLanding);
}
