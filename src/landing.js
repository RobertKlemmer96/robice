const PRICING_CAROUSEL_MQ = '(max-width: 1023px)';

export function initLanding() {
  initLandingHeaderNav();
  initLandingPricingCarousel();
}

function initLandingHeaderNav() {
  document.querySelectorAll('.landing-header__nav-link[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if (!hash || hash.length < 2) return;
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', hash);
    });
  });
}

function initLandingPricingCarousel() {
  const root = document.querySelector('[data-landing-pricing-carousel]');
  if (!root) return;

  const track = root.querySelector('.landing-pricing__track');
  const plans = [...root.querySelectorAll('.landing-plan')];
  const prevBtn = root.querySelector('.landing-pricing__arrow--prev');
  const nextBtn = root.querySelector('.landing-pricing__arrow--next');
  const dots = [...root.querySelectorAll('[data-landing-pricing-dot]')];
  const mq = window.matchMedia(PRICING_CAROUSEL_MQ);

  if (!track || plans.length === 0) return;

  let activeIndex = 0;
  let scrollRaf = 0;

  function isCarouselMode() {
    return mq.matches;
  }

  function scrollToIndex(index, behavior = 'smooth') {
    const clamped = Math.max(0, Math.min(plans.length - 1, index));
    activeIndex = clamped;
    if (!isCarouselMode()) {
      syncControls();
      return;
    }

    plans[clamped].scrollIntoView({
      behavior,
      inline: 'center',
      block: 'nearest',
    });
    syncControls();
  }

  function syncControls() {
    const carousel = isCarouselMode();
    root.classList.toggle('is-carousel', carousel);

    prevBtn?.toggleAttribute('disabled', !carousel || activeIndex <= 0);
    nextBtn?.toggleAttribute('disabled', !carousel || activeIndex >= plans.length - 1);

    dots.forEach((dot, index) => {
      const selected = carousel && index === activeIndex;
      dot.classList.toggle('is-active', selected);
      dot.setAttribute('aria-selected', String(selected));
    });
  }

  function updateActiveFromScroll() {
    if (!isCarouselMode()) return;

    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let minDistance = Infinity;

    plans.forEach((plan, index) => {
      const planCenter = plan.offsetLeft + plan.offsetWidth / 2;
      const distance = Math.abs(center - planCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closest = index;
      }
    });

    if (closest !== activeIndex) {
      activeIndex = closest;
      syncControls();
    }
  }

  function onTrackScroll() {
    cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(updateActiveFromScroll);
  }

  prevBtn?.addEventListener('click', () => scrollToIndex(activeIndex - 1));
  nextBtn?.addEventListener('click', () => scrollToIndex(activeIndex + 1));
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const index = Number.parseInt(dot.dataset.landingPricingDot ?? '0', 10);
      scrollToIndex(Number.isNaN(index) ? 0 : index);
    });
  });

  track.addEventListener('scroll', onTrackScroll, { passive: true });

  mq.addEventListener('change', () => {
    syncControls();
    if (isCarouselMode()) {
      scrollToIndex(activeIndex, 'auto');
    }
  });

  syncControls();
}
