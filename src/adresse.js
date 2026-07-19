export function splitAdresse(adresse = '') {
  const text = String(adresse || '').trim();
  if (!text) return { strasse: '', plzOrt: '' };

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    return { strasse: lines[0], plzOrt: lines.slice(1).join(' ') };
  }

  const comma = lines[0].match(/^(.+?),\s*(\d{4,5}\s*.+)$/);
  if (comma) {
    return { strasse: comma[1].trim(), plzOrt: comma[2].trim() };
  }

  return { strasse: lines[0], plzOrt: '' };
}

export function joinAdresse({ strasse = '', plzOrt = '', adresse = '' } = {}) {
  const s = String(strasse || '').trim();
  const p = String(plzOrt || '').trim();
  if (s || p) return [s, p].filter(Boolean).join('\n');
  return String(adresse || '').trim();
}

export function normalizeAdresse(input = {}) {
  const s = String(input.strasse ?? '').trim();
  const p = String(input.plzOrt ?? input.plz_ort ?? '').trim();

  if (s || p) {
    return {
      strasse: s,
      plzOrt: p,
      adresse: joinAdresse({ strasse: s, plzOrt: p }),
    };
  }

  const split = splitAdresse(input.adresse);
  return {
    strasse: split.strasse,
    plzOrt: split.plzOrt,
    adresse: joinAdresse(split),
  };
}

export function adresseToLines(adresseLike) {
  const { strasse, plzOrt, adresse } = normalizeAdresse(adresseLike);
  const lines = [strasse, plzOrt].filter(Boolean);
  if (lines.length) return lines;
  if (!adresse) return [];
  return adresse
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function setAdresseFieldPair(strasseEl, plzOrtEl, adresseLike) {
  const { strasse, plzOrt } = normalizeAdresse(adresseLike);
  if (strasseEl) strasseEl.value = strasse;
  if (plzOrtEl) plzOrtEl.value = plzOrt;
}

export function readAdresseFieldPair(strasseEl, plzOrtEl) {
  return normalizeAdresse({
    strasse: strasseEl?.value ?? '',
    plzOrt: plzOrtEl?.value ?? '',
  });
}

export function clearAdresseFieldPair(strasseEl, plzOrtEl) {
  if (strasseEl) strasseEl.value = '';
  if (plzOrtEl) plzOrtEl.value = '';
}
