const FLAG_SVGS = {
  de: `<svg class="lang-flag__svg" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="24" height="5.333" fill="#000000"/>
    <rect y="5.333" width="24" height="5.333" fill="#DD0000"/>
    <rect y="10.667" width="24" height="5.333" fill="#FFCE00"/>
  </svg>`,
  en: `<svg class="lang-flag__svg" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="24" height="16" fill="#012169"/>
    <path d="M0 0 24 16M24 0 0 16" stroke="#FFFFFF" stroke-width="3.2"/>
    <path d="M0 0 24 16M24 0 0 16" stroke="#C8102E" stroke-width="1.6"/>
    <path d="M10 0h4v16h-4zM0 6h24v4H0z" fill="#FFFFFF"/>
    <path d="M11 0h2v16h-2zM0 7h24v2H0z" fill="#C8102E"/>
  </svg>`,
};

export function getFlagSvg(locale) {
  return FLAG_SVGS[locale] || FLAG_SVGS.de;
}

export function renderFlag(locale) {
  return getFlagSvg(locale);
}

export function mountFlag(el, locale) {
  if (!el) return;
  el.innerHTML = getFlagSvg(locale);
}

export function mountAllFlags() {
  document.querySelectorAll('[data-flag-locale]').forEach((el) => {
    mountFlag(el, el.dataset.flagLocale);
  });
}
