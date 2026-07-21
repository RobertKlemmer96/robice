import { getFlagSvg } from './flags.js';
import { getLocale, setLocale, syncLangSwitcherUi, t } from './i18n.js';

function closeLangMenus(exceptWrap = null) {
  document.querySelectorAll('.lang-switcher').forEach((wrap) => {
    if (wrap === exceptWrap) return;
    wrap.classList.remove('is-open');
    wrap.querySelector('.lang-switcher__menu')?.classList.add('hidden');
    wrap.querySelector('.lang-switcher__trigger')?.setAttribute('aria-expanded', 'false');
  });
}

function toggleLangMenu(wrap) {
  const menu = wrap.querySelector('.lang-switcher__menu');
  const trigger = wrap.querySelector('.lang-switcher__trigger');
  if (!menu || !trigger) return;

  const willOpen = menu.classList.contains('hidden');
  closeLangMenus(willOpen ? wrap : null);

  menu.classList.toggle('hidden', !willOpen);
  wrap.classList.toggle('is-open', willOpen);
  trigger.setAttribute('aria-expanded', String(willOpen));
}

export function initLangSwitcher() {
  document.querySelectorAll('.lang-switcher').forEach((wrap) => {
    const trigger = wrap.querySelector('.lang-switcher__trigger');
    const menu = wrap.querySelector('.lang-switcher__menu');

    trigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLangMenu(wrap);
    });

    wrap.querySelectorAll('[data-locale]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const { locale } = btn.dataset;
        if (locale && locale !== getLocale()) {
          setLocale(locale);
        }
        closeLangMenus();
      });
    });
  });

  document.addEventListener('click', () => closeLangMenus());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLangMenus();
  });

  syncLangSwitcherUi();
}

export function langSwitcherHtml({ idPrefix = 'lang-switcher' } = {}) {
  const locale = getLocale();

  return `
    <div class="lang-switcher" id="${idPrefix}-wrap">
      <button
        type="button"
        class="lang-switcher__trigger app-header__action-btn"
        id="${idPrefix}"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls="${idPrefix}-menu"
        data-i18n-aria-label="lang.choose"
        data-i18n-title="lang.choose"
        title="${t('lang.choose')}"
        aria-label="${t('lang.choose')}"
      >
        <span class="lang-switcher__flag" aria-hidden="true">${getFlagSvg(locale)}</span>
      </button>
      <div class="lang-switcher__menu hidden" id="${idPrefix}-menu" role="menu" data-i18n-aria-label="lang.menu" aria-label="${t('lang.menu')}">
        <button type="button" class="lang-switcher__option${locale === 'de' ? ' is-active' : ''}" role="menuitemradio" data-locale="de" aria-checked="${locale === 'de'}">
          <span class="lang-switcher__option-flag" data-flag-locale="de" aria-hidden="true">${getFlagSvg('de')}</span>
          <span>Deutsch</span>
        </button>
        <button type="button" class="lang-switcher__option${locale === 'en' ? ' is-active' : ''}" role="menuitemradio" data-locale="en" aria-checked="${locale === 'en'}">
          <span class="lang-switcher__option-flag" data-flag-locale="en" aria-hidden="true">${getFlagSvg('en')}</span>
          <span>English</span>
        </button>
      </div>
    </div>
  `;
}
