import { FIRMA } from './data.js';

import { apiFetch } from './apiClient.js';

const API_BASE = '/api/pdf-template';

let cachedTemplate = null;

export function getDefaultPdfTemplate() {
  return {
    firma: {
      name: FIRMA.name,
      strasse: FIRMA.strasse,
      plzOrt: FIRMA.plzOrt,
      telefon: FIRMA.telefon,
      email: FIRMA.email,
      web: FIRMA.web,
      ustId: FIRMA.ustId,
    },
    farben: {
      primaer: '#1e3a5f',
      textMuted: '#505050',
      fusszeile: '#646464',
      trennlinie: '#dcdcdc',
    },
    texte: {
      titel: 'ANGEBOT',
      einleitung:
        'Vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes Angebot:',
      fuss1:
        'Dieses Angebot ist freibleibend. Es gelten unsere allgemeinen Geschäftsbedingungen.',
      fuss2: 'Wir freuen uns auf Ihre Rückmeldung.',
    },
    bilder: {
      logo: '',
      header: '',
    },
    layout: {
      logoBreiteMm: 35,
      logoHoeheMm: 18,
      headerHoeheMm: 22,
      headerAktiv: false,
    },
    angebot: {
      nummerSchema: 'ANG-{YYYY}{MM}{DD}-{NR:3}',
    },
    rechnung: {
      nummerSchema: 'RE-{YYYY}{MM}{DD}-{NR:3}',
      zahlungszielTage: 14,
    },
    texteRechnung: {
      titel: 'RECHNUNG',
      einleitung: 'Wir stellen Ihnen folgende Leistungen in Rechnung:',
      fuss1: 'Bitte überweisen Sie den Rechnungsbetrag bis zum angegebenen Fälligkeitsdatum.',
      fuss2: 'Es gelten unsere allgemeinen Geschäftsbedingungen.',
    },
  };
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  const out = { ...base };
  for (const key of Object.keys(patch)) {
    const val = patch[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = deepMerge(base[key] || {}, val);
    } else if (val !== undefined) {
      out[key] = val;
    }
  }
  return out;
}

export function mergePdfTemplate(stored) {
  return deepMerge(getDefaultPdfTemplate(), stored || {});
}

export function hexToRgb(hex) {
  const raw = String(hex || '').replace('#', '').trim();
  if (raw.length !== 6) return [30, 58, 95];
  const n = Number.parseInt(raw, 16);
  if (!Number.isFinite(n)) return [30, 58, 95];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function getPdfTemplate() {
  return cachedTemplate || getDefaultPdfTemplate();
}

export async function loadPdfTemplate() {
  try {
    const data = await apiFetch(API_BASE);
    cachedTemplate = mergePdfTemplate(data);
  } catch {
    cachedTemplate = getDefaultPdfTemplate();
  }
  return cachedTemplate;
}

export async function savePdfTemplate(template) {
  const merged = mergePdfTemplate(template);
  try {
    const saved = await apiFetch(API_BASE, {
      method: 'PUT',
      body: JSON.stringify(merged),
    });
    cachedTemplate = mergePdfTemplate(saved);
  } catch (err) {
    if (err.status === 413) {
      throw new Error('Die Vorlage ist zu groß. Bitte kleinere Bilder verwenden.');
    }
    if (err.status >= 500) {
      throw new Error(
        'Server konnte die Vorlage nicht speichern. Läuft die API (Port 3001)?'
      );
    }
    throw err;
  }
  return cachedTemplate;
}

export function templatePatchFromAngebotPage(form) {
  let patch = {};
  for (const section of ['bilder', 'firma', 'farben', 'angebot-nummer', 'angebot-texte']) {
    patch = { ...patch, ...templatePatchFromForm(form, section) };
  }
  return patch;
}

export function templatePatchFromRechnungPage(form) {
  let patch = {};
  for (const section of ['bilder', 'firma', 'farben', 'rechnung-nummer', 'rechnung-texte']) {
    patch = { ...patch, ...templatePatchFromForm(form, section) };
  }
  return patch;
}

export function fillPdfTemplateAngebotForm(form, template) {
  const tpl = mergePdfTemplate(template);
  for (const section of ['bilder', 'firma', 'farben', 'angebot-nummer', 'angebot-texte']) {
    fillPdfTemplateSectionForm(form, tpl, section);
  }
}

export function fillPdfTemplateRechnungForm(form, template) {
  const tpl = mergePdfTemplate(template);
  for (const section of ['bilder', 'firma', 'farben', 'rechnung-nummer', 'rechnung-texte']) {
    fillPdfTemplateSectionForm(form, tpl, section);
  }
}

export function templatePatchFromForm(form, section) {
  const fd = new FormData(form);
  switch (section) {
    case 'firma':
      return {
        firma: {
          name: String(fd.get('firma-name') || '').trim(),
          strasse: String(fd.get('firma-strasse') || '').trim(),
          plzOrt: String(fd.get('firma-plzOrt') || '').trim(),
          telefon: String(fd.get('firma-telefon') || '').trim(),
          email: String(fd.get('firma-email') || '').trim(),
          web: String(fd.get('firma-web') || '').trim(),
          ustId: String(fd.get('firma-ustId') || '').trim(),
        },
      };
    case 'farben':
      return {
        farben: {
          primaer: String(fd.get('farbe-primaer') || '#1e3a5f'),
          textMuted: String(fd.get('farbe-textMuted') || '#505050'),
          fusszeile: String(fd.get('farbe-fusszeile') || '#646464'),
          trennlinie: String(fd.get('farbe-trennlinie') || '#dcdcdc'),
        },
      };
    case 'angebot-texte':
      return {
        texte: {
          titel: String(fd.get('text-titel') || 'ANGEBOT').trim(),
          einleitung: String(fd.get('text-einleitung') || '').trim(),
          fuss1: String(fd.get('text-fuss1') || '').trim(),
          fuss2: String(fd.get('text-fuss2') || '').trim(),
        },
      };
    case 'angebot-nummer':
      return {
        angebot: {
          nummerSchema:
            String(fd.get('angebot-nummer-schema') || '').trim() || 'ANG-{YYYY}{MM}{DD}-{NR:3}',
        },
      };
    case 'rechnung-nummer':
      return {
        rechnung: {
          nummerSchema:
            String(fd.get('rechnung-nummer-schema') || '').trim() || 'RE-{YYYY}{MM}{DD}-{NR:3}',
          zahlungszielTage: Number(fd.get('rechnung-zahlungsziel-tage')) || 14,
        },
      };
    case 'rechnung-texte':
      return {
        texteRechnung: {
          titel: String(fd.get('rechnung-text-titel') || 'RECHNUNG').trim(),
          einleitung: String(fd.get('rechnung-text-einleitung') || '').trim(),
          fuss1: String(fd.get('rechnung-text-fuss1') || '').trim(),
          fuss2: String(fd.get('rechnung-text-fuss2') || '').trim(),
        },
      };
    case 'bilder':
      return {
        bilder: {
          logo: form.dataset.logoData || '',
          header: form.dataset.headerData || '',
        },
        layout: {
          logoBreiteMm: Number(fd.get('layout-logoBreiteMm')) || 35,
          logoHoeheMm: Number(fd.get('layout-logoHoeheMm')) || 18,
          headerHoeheMm: Number(fd.get('layout-headerHoeheMm')) || 22,
          headerAktiv: fd.get('layout-headerAktiv') === 'on',
        },
      };
    default:
      return {};
  }
}

export function fillPdfTemplateSectionForm(form, template, section) {
  const tpl = mergePdfTemplate(template);
  switch (section) {
    case 'firma':
      form.elements['firma-name'].value = tpl.firma.name;
      form.elements['firma-strasse'].value = tpl.firma.strasse;
      form.elements['firma-plzOrt'].value = tpl.firma.plzOrt;
      form.elements['firma-telefon'].value = tpl.firma.telefon;
      form.elements['firma-email'].value = tpl.firma.email;
      form.elements['firma-web'].value = tpl.firma.web;
      form.elements['firma-ustId'].value = tpl.firma.ustId;
      break;
    case 'farben':
      form.elements['farbe-primaer'].value = tpl.farben.primaer;
      form.elements['farbe-textMuted'].value = tpl.farben.textMuted;
      form.elements['farbe-fusszeile'].value = tpl.farben.fusszeile;
      form.elements['farbe-trennlinie'].value = tpl.farben.trennlinie;
      break;
    case 'angebot-texte':
      form.elements['text-titel'].value = tpl.texte.titel;
      form.elements['text-einleitung'].value = tpl.texte.einleitung;
      form.elements['text-fuss1'].value = tpl.texte.fuss1;
      form.elements['text-fuss2'].value = tpl.texte.fuss2;
      break;
    case 'angebot-nummer':
      form.elements['angebot-nummer-schema'].value =
        tpl.angebot?.nummerSchema || 'ANG-{YYYY}{MM}{DD}-{NR:3}';
      break;
    case 'rechnung-nummer':
      form.elements['rechnung-nummer-schema'].value =
        tpl.rechnung?.nummerSchema || 'RE-{YYYY}{MM}{DD}-{NR:3}';
      form.elements['rechnung-zahlungsziel-tage'].value = tpl.rechnung?.zahlungszielTage ?? 14;
      break;
    case 'rechnung-texte':
      form.elements['rechnung-text-titel'].value = tpl.texteRechnung?.titel || 'RECHNUNG';
      form.elements['rechnung-text-einleitung'].value = tpl.texteRechnung?.einleitung || '';
      form.elements['rechnung-text-fuss1'].value = tpl.texteRechnung?.fuss1 || '';
      form.elements['rechnung-text-fuss2'].value = tpl.texteRechnung?.fuss2 || '';
      break;
    case 'bilder':
      form.elements['layout-logoBreiteMm'].value = tpl.layout.logoBreiteMm;
      form.elements['layout-logoHoeheMm'].value = tpl.layout.logoHoeheMm;
      form.elements['layout-headerHoeheMm'].value = tpl.layout.headerHoeheMm;
      form.elements['layout-headerAktiv'].checked = tpl.layout.headerAktiv;
      form.dataset.logoData = tpl.bilder.logo || '';
      form.dataset.headerData = tpl.bilder.header || '';
      updateImagePreview(form.querySelector('[data-preview="logo"]'), tpl.bilder.logo);
      updateImagePreview(form.querySelector('[data-preview="header"]'), tpl.bilder.header);
      break;
    default:
      break;
  }
}

export function templateFromForm(form) {
  const fd = new FormData(form);
  return {
    firma: {
      name: String(fd.get('firma-name') || '').trim(),
      strasse: String(fd.get('firma-strasse') || '').trim(),
      plzOrt: String(fd.get('firma-plzOrt') || '').trim(),
      telefon: String(fd.get('firma-telefon') || '').trim(),
      email: String(fd.get('firma-email') || '').trim(),
      web: String(fd.get('firma-web') || '').trim(),
      ustId: String(fd.get('firma-ustId') || '').trim(),
    },
    farben: {
      primaer: String(fd.get('farbe-primaer') || '#1e3a5f'),
      textMuted: String(fd.get('farbe-textMuted') || '#505050'),
      fusszeile: String(fd.get('farbe-fusszeile') || '#646464'),
      trennlinie: String(fd.get('farbe-trennlinie') || '#dcdcdc'),
    },
    texte: {
      titel: String(fd.get('text-titel') || 'ANGEBOT').trim(),
      einleitung: String(fd.get('text-einleitung') || '').trim(),
      fuss1: String(fd.get('text-fuss1') || '').trim(),
      fuss2: String(fd.get('text-fuss2') || '').trim(),
    },
    bilder: {
      logo: form.dataset.logoData || '',
      header: form.dataset.headerData || '',
    },
    layout: {
      logoBreiteMm: Number(fd.get('layout-logoBreiteMm')) || 35,
      logoHoeheMm: Number(fd.get('layout-logoHoeheMm')) || 18,
      headerHoeheMm: Number(fd.get('layout-headerHoeheMm')) || 22,
      headerAktiv: fd.get('layout-headerAktiv') === 'on',
    },
    angebot: {
      nummerSchema:
        String(fd.get('angebot-nummer-schema') || '').trim() || 'ANG-{YYYY}{MM}{DD}-{NR:3}',
    },
    rechnung: {
      nummerSchema:
        String(fd.get('rechnung-nummer-schema') || '').trim() || 'RE-{YYYY}{MM}{DD}-{NR:3}',
      zahlungszielTage: Number(fd.get('rechnung-zahlungsziel-tage')) || 14,
    },
    texteRechnung: {
      titel: String(fd.get('rechnung-text-titel') || 'RECHNUNG').trim(),
      einleitung: String(fd.get('rechnung-text-einleitung') || '').trim(),
      fuss1: String(fd.get('rechnung-text-fuss1') || '').trim(),
      fuss2: String(fd.get('rechnung-text-fuss2') || '').trim(),
    },
  };
}

export function fillPdfTemplateForm(form, template) {
  const tpl = mergePdfTemplate(template);
  form.elements['firma-name'].value = tpl.firma.name;
  form.elements['firma-strasse'].value = tpl.firma.strasse;
  form.elements['firma-plzOrt'].value = tpl.firma.plzOrt;
  form.elements['firma-telefon'].value = tpl.firma.telefon;
  form.elements['firma-email'].value = tpl.firma.email;
  form.elements['firma-web'].value = tpl.firma.web;
  form.elements['firma-ustId'].value = tpl.firma.ustId;

  form.elements['farbe-primaer'].value = tpl.farben.primaer;
  form.elements['farbe-textMuted'].value = tpl.farben.textMuted;
  form.elements['farbe-fusszeile'].value = tpl.farben.fusszeile;
  form.elements['farbe-trennlinie'].value = tpl.farben.trennlinie;

  form.elements['text-titel'].value = tpl.texte.titel;
  form.elements['text-einleitung'].value = tpl.texte.einleitung;
  form.elements['text-fuss1'].value = tpl.texte.fuss1;
  form.elements['text-fuss2'].value = tpl.texte.fuss2;

  form.elements['layout-logoBreiteMm'].value = tpl.layout.logoBreiteMm;
  form.elements['layout-logoHoeheMm'].value = tpl.layout.logoHoeheMm;
  form.elements['layout-headerHoeheMm'].value = tpl.layout.headerHoeheMm;
  form.elements['layout-headerAktiv'].checked = tpl.layout.headerAktiv;

  if (form.elements['angebot-nummer-schema']) {
    form.elements['angebot-nummer-schema'].value =
      tpl.angebot?.nummerSchema || 'ANG-{YYYY}{MM}{DD}-{NR:3}';
  }

  if (form.elements['rechnung-nummer-schema']) {
    form.elements['rechnung-nummer-schema'].value =
      tpl.rechnung?.nummerSchema || 'RE-{YYYY}{MM}{DD}-{NR:3}';
  }
  if (form.elements['rechnung-zahlungsziel-tage']) {
    form.elements['rechnung-zahlungsziel-tage'].value =
      tpl.rechnung?.zahlungszielTage ?? 14;
  }
  if (form.elements['rechnung-text-titel']) {
    form.elements['rechnung-text-titel'].value = tpl.texteRechnung?.titel || 'RECHNUNG';
    form.elements['rechnung-text-einleitung'].value = tpl.texteRechnung?.einleitung || '';
    form.elements['rechnung-text-fuss1'].value = tpl.texteRechnung?.fuss1 || '';
    form.elements['rechnung-text-fuss2'].value = tpl.texteRechnung?.fuss2 || '';
  }

  form.dataset.logoData = tpl.bilder.logo || '';
  form.dataset.headerData = tpl.bilder.header || '';

  const logoPreview = form.querySelector('[data-preview="logo"]');
  const headerPreview = form.querySelector('[data-preview="header"]');
  updateImagePreview(logoPreview, tpl.bilder.logo);
  updateImagePreview(headerPreview, tpl.bilder.header);
}

export function updateImagePreview(container, dataUrl) {
  if (!container) return;
  container.replaceChildren();
  if (dataUrl) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = '';
    container.appendChild(img);
    container.classList.remove('is-empty');
  } else {
    const span = document.createElement('span');
    span.className = 'image-preview-placeholder';
    span.textContent = 'Kein Bild';
    container.appendChild(span);
    container.classList.add('is-empty');
  }
}

export const IMAGE_UPLOAD = {
  maxFileBytes: 2 * 1024 * 1024,
  maxStoredChars: 1_200_000,
  acceptTypes: ['image/png', 'image/jpeg', 'image/webp'],
  logoMaxPx: 640,
  headerMaxPx: 1600,
};

export function formatImageUploadHint(kind = 'logo') {
  const maxMb = IMAGE_UPLOAD.maxFileBytes / (1024 * 1024);
  const px = kind === 'header' ? IMAGE_UPLOAD.headerMaxPx : IMAGE_UPLOAD.logoMaxPx;
  return `PNG, JPG oder WebP, max. ${maxMb} MB. Wird für die PDF auf max. ${px}px verkleinert.`;
}

function dataUrlByteLength(dataUrl) {
  const base64 = String(dataUrl).split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

function loadImageElement(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht verarbeitet werden.'));
    img.src = dataUrl;
  });
}

async function optimizeImageDataUrl(dataUrl, { maxWidth, mimeType }) {
  const img = await loadImageElement(dataUrl);
  const scale = Math.min(1, maxWidth / img.width);
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Bild konnte nicht verarbeitet werden.');
  ctx.drawImage(img, 0, 0, width, height);

  const useJpeg = mimeType === 'image/jpeg';
  let quality = 0.88;
  let out = canvas.toDataURL(useJpeg ? 'image/jpeg' : 'image/png', quality);

  while (dataUrlByteLength(out) > IMAGE_UPLOAD.maxStoredChars && quality > 0.45) {
    quality -= 0.08;
    out = canvas.toDataURL(useJpeg ? 'image/jpeg' : 'image/png', quality);
  }

  if (dataUrlByteLength(out) > IMAGE_UPLOAD.maxStoredChars && width > 200) {
    return optimizeImageDataUrl(out, { maxWidth: Math.round(maxWidth * 0.75), mimeType });
  }

  if (dataUrlByteLength(out) > IMAGE_UPLOAD.maxStoredChars) {
    throw new Error(
      'Das Bild ist nach dem Verkleinern immer noch zu groß. Bitte eine kleinere Datei wählen.'
    );
  }

  return out;
}

export async function readImageFileAsDataUrl(file, kind = 'logo') {
  const maxBytes = IMAGE_UPLOAD.maxFileBytes;
  return new Promise((resolve, reject) => {
    if (!file || !IMAGE_UPLOAD.acceptTypes.includes(file.type)) {
      reject(new Error('Bitte PNG, JPG oder WebP wählen.'));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error(`Das Bild ist zu groß (max. ${maxBytes / (1024 * 1024)} MB).`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result);
      const maxWidth = kind === 'header' ? IMAGE_UPLOAD.headerMaxPx : IMAGE_UPLOAD.logoMaxPx;
      optimizeImageDataUrl(raw, { maxWidth, mimeType: file.type })
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

export function detectImageFormat(dataUrl) {
  if (String(dataUrl).startsWith('data:image/jpeg')) return 'JPEG';
  if (String(dataUrl).startsWith('data:image/png')) return 'PNG';
  if (String(dataUrl).startsWith('data:image/webp')) return 'WEBP';
  return 'PNG';
}
